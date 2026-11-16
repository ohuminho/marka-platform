import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import {
  canAcceptAdditionalFreightAssignment,
  canAcceptFreightAlongsideActiveAssignments,
  doesFreightFitVehicleCapacity,
} from "@/freight-engine/freight-provider-availability";
import {
  isFreightProviderLocationFresh,
  isWithinFreightPickupRadius,
} from "@/freight-engine/freight-proximity";

const bodySchema = z.object({ vehicleId: z.string().uuid() });
const compatibleKinds = {
  CARGO_SHIPMENT: ["CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "SPECIALIZED"],
  WATER_DELIVERY: ["WATER_TANKER"],
  ROADSIDE_ASSISTANCE: ["TOW_TRUCK", "SERVICE_VEHICLE"],
} as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Seleccione uma viatura activa.", code: "INVALID_FREIGHT_VEHICLE" }, { status: 400 });

  const provider = await prisma.freightProvider.findUnique({
    where: { organizationId_userId: { organizationId: auth.session.organizationId, userId: auth.session.userId } },
    include: { vehicles: { where: { id: parsed.data.vehicleId, status: "ACTIVE" } } },
  });
  if (!provider || provider.status !== "VERIFIED") return NextResponse.json({ message: "O prestador não está verificado.", code: "FREIGHT_PROVIDER_NOT_VERIFIED" }, { status: 403 });
  if (!canAcceptAdditionalFreightAssignment(provider.availability)) return NextResponse.json({ message: "O prestador não está disponível para aceitar pedidos.", code: "FREIGHT_PROVIDER_NOT_AVAILABLE" }, { status: 409 });
  const vehicle = provider.vehicles[0];
  if (!vehicle) return NextResponse.json({ message: "A viatura não pertence ao prestador ou não está activa.", code: "FREIGHT_VEHICLE_NOT_ACTIVE" }, { status: 409 });

  const freight = await prisma.freightRequest.findFirst({ where: { id, organizationId: auth.session.organizationId } });
  if (!freight) return NextResponse.json({ message: "Pedido não encontrado.", code: "FREIGHT_REQUEST_NOT_FOUND" }, { status: 404 });
  const freightDetails = freight.details && typeof freight.details === "object" ? freight.details as Record<string, unknown> : {};
  const requestedVehicleKind = typeof freightDetails.vehiclePreference === "string" ? freightDetails.vehiclePreference : null;
  if (!provider.serviceTypes.includes(freight.requestType) || !compatibleKinds[freight.requestType].includes(vehicle.kind as never) || (requestedVehicleKind && requestedVehicleKind !== "ANY" && vehicle.kind !== requestedVehicleKind)) {
    return NextResponse.json({ message: "A viatura não é compatível com este serviço.", code: "INCOMPATIBLE_FREIGHT_VEHICLE" }, { status: 409 });
  }
  if (!freight.paidAt || !["PAID", "SEARCHING_PROVIDER"].includes(freight.status)) {
    return NextResponse.json({ message: "O pedido só pode ser aceite depois da confirmação do pagamento.", code: "FREIGHT_PAYMENT_NOT_CONFIRMED" }, { status: 409 });
  }

  const pickupPoint = freight.originLatitude !== null && freight.originLongitude !== null
    ? { latitude: freight.originLatitude, longitude: freight.originLongitude }
    : freight.destinationLatitude !== null && freight.destinationLongitude !== null
      ? { latitude: freight.destinationLatitude, longitude: freight.destinationLongitude }
      : null;
  if (
    provider.currentLatitude === null ||
    provider.currentLongitude === null ||
    provider.locationAccuracyM === null ||
    provider.locationAccuracyM > 1000 ||
    !isFreightProviderLocationFresh(provider.locationUpdatedAt) ||
    pickupPoint === null ||
    !isWithinFreightPickupRadius(
      { latitude: Number(provider.currentLatitude), longitude: Number(provider.currentLongitude) },
      { latitude: Number(pickupPoint.latitude), longitude: Number(pickupPoint.longitude) },
    )
  ) {
    return NextResponse.json(
      { message: "Actualize a localização GPS. Só pode aceitar pedidos dentro da área próxima definida pela MARKA.", code: "FREIGHT_PROVIDER_OUTSIDE_PICKUP_RADIUS" },
      { status: 409 },
    );
  }
  if (
    freight.requestType === "CARGO_SHIPMENT" &&
    !doesFreightFitVehicleCapacity({
      requestType: freight.requestType,
      quantity: freight.quantity === null ? null : Number(freight.quantity),
      quantityUnit: freight.quantityUnit,
      details: freight.details,
      vehicle: {
        id: vehicle.id,
        kind: vehicle.kind,
        capacity: vehicle.capacity === null ? null : Number(vehicle.capacity),
        capacityUnit: vehicle.capacityUnit,
        waterType: vehicle.waterType,
      },
    })
  ) {
    return NextResponse.json(
      { message: "A quantidade indicada excede a capacidade registada da viatura ou usa uma unidade incompatível.", code: "FREIGHT_VEHICLE_CAPACITY_MISMATCH" },
      { status: 409 },
    );
  }

  if (freight.requestType === "WATER_DELIVERY") {
    const details = freight.details && typeof freight.details === "object" ? freight.details as Record<string, unknown> : {};
    if (vehicle.kind !== "WATER_TANKER" || vehicle.waterType !== details.waterType || !vehicle.capacity || !vehicle.capacityUnit || !freight.quantity || !freight.quantityUnit || !["M3", "LITRE"].includes(vehicle.capacityUnit) || !["M3", "LITRE"].includes(freight.quantityUnit)) {
      return NextResponse.json({ message: "A cisterna não corresponde ao tipo ou volume de água solicitado.", code: "WATER_TANKER_CAPACITY_MISMATCH" }, { status: 409 });
    }
    const availableLitres = Number(vehicle.capacity) * (vehicle.capacityUnit === "M3" ? 1000 : 1);
    const requestedLitres = Number(freight.quantity) * (freight.quantityUnit === "M3" ? 1000 : 1);
    if (availableLitres < requestedLitres) return NextResponse.json({ message: "A capacidade da cisterna é inferior ao volume solicitado.", code: "WATER_TANKER_CAPACITY_INSUFFICIENT" }, { status: 409 });
  }

  try {
    const assigned = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${provider.id}))`;

      // Re-read consent, GPS freshness and availability under the same lock
      // used by the location endpoint, closing the opt-out/accept race.
      const lockedProvider = await tx.freightProvider.findUnique({
        where: { id: provider.id },
        select: {
          status: true,
          availability: true,
          currentLatitude: true,
          currentLongitude: true,
          locationUpdatedAt: true,
          locationAccuracyM: true,
        },
      });
      if (
        !lockedProvider ||
        lockedProvider.status !== "VERIFIED" ||
        !canAcceptAdditionalFreightAssignment(lockedProvider.availability) ||
        lockedProvider.currentLatitude === null ||
        lockedProvider.currentLongitude === null ||
        lockedProvider.locationAccuracyM === null ||
        lockedProvider.locationAccuracyM > 1000 ||
        !isFreightProviderLocationFresh(lockedProvider.locationUpdatedAt) ||
        pickupPoint === null ||
        !isWithinFreightPickupRadius(
          { latitude: Number(lockedProvider.currentLatitude), longitude: Number(lockedProvider.currentLongitude) },
          { latitude: Number(pickupPoint.latitude), longitude: Number(pickupPoint.longitude) },
        )
      ) {
        throw new Error("FREIGHT_PROVIDER_LOCATION_STALE");
      }

      const activeAssignments = await tx.freightRequest.findMany({
        where: {
          organizationId: auth.session.organizationId,
          assignedProviderId: provider.id,
          status: {
            in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"],
          },
        },
        select: {
          requestType: true,
          assignedVehicleId: true,
          quantity: true,
          quantityUnit: true,
          destinationLatitude: true,
          destinationLongitude: true,
          details: true,
        },
      });
      if (activeAssignments.length > 0 && !canAcceptFreightAlongsideActiveAssignments({
        activeAssignments: activeAssignments.map((active) => ({
          requestType: active.requestType,
          assignedVehicleId: active.assignedVehicleId,
          quantity: active.quantity === null ? null : Number(active.quantity),
          quantityUnit: active.quantityUnit,
          destinationLatitude: active.destinationLatitude === null ? null : Number(active.destinationLatitude),
          destinationLongitude: active.destinationLongitude === null ? null : Number(active.destinationLongitude),
          details: active.details,
        })),
        candidate: {
          requestType: freight.requestType,
          assignedVehicleId: vehicle.id,
          quantity: freight.quantity === null ? null : Number(freight.quantity),
          quantityUnit: freight.quantityUnit,
          destinationLatitude: freight.destinationLatitude === null ? null : Number(freight.destinationLatitude),
          destinationLongitude: freight.destinationLongitude === null ? null : Number(freight.destinationLongitude),
          details: freight.details,
        },
        vehicle: {
          id: vehicle.id,
          kind: vehicle.kind,
          capacity: vehicle.capacity === null ? null : Number(vehicle.capacity),
          capacityUnit: vehicle.capacityUnit,
          waterType: vehicle.waterType,
        },
      })) {
        throw new Error("FREIGHT_MULTI_ASSIGNMENT_LIMIT_OR_CAPACITY");
      }

      const providerClaim = await tx.freightProvider.updateMany({
        where: { id: provider.id, status: "VERIFIED", availability: { in: ["AVAILABLE", "BUSY"] } },
        data: { availability: "BUSY" },
      });
      if (providerClaim.count !== 1) throw new Error("PROVIDER_ALREADY_CLAIMED");

      const requestClaim = await tx.freightRequest.updateMany({
        where: { id: freight.id, organizationId: auth.session.organizationId, assignedProviderId: null, paidAt: { not: null }, status: { in: ["PAID", "SEARCHING_PROVIDER"] } },
        data: { status: "ASSIGNED", assignedProviderId: provider.id, assignedVehicleId: vehicle.id, assignedAt: new Date() },
      });
      if (requestClaim.count !== 1) throw new Error("REQUEST_ALREADY_ASSIGNED_OR_UNPAID");

      return tx.freightRequest.findUniqueOrThrow({ where: { id: freight.id } });
    });
    return NextResponse.json({ request: { id: assigned.id, reference: assigned.reference, status: assigned.status, assignedAt: assigned.assignedAt } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_ASSIGNMENT_FAILED";
    const conflict = code === "PROVIDER_ALREADY_CLAIMED" || code === "REQUEST_ALREADY_ASSIGNED_OR_UNPAID" || code === "FREIGHT_MULTI_ASSIGNMENT_LIMIT_OR_CAPACITY";
    const message = code === "FREIGHT_MULTI_ASSIGNMENT_LIMIT_OR_CAPACITY"
      ? "Para agrupar serviços, a MARKA exige o mesmo tipo de serviço, a mesma viatura, destinos próximos e quantidade total declarada dentro da capacidade. Assistência rodoviária fica limitada a uma atribuição."
      : conflict ? "Este pedido ou prestador já foi atribuído. Actualize a lista." : "Não foi possível atribuir o pedido.";
    return NextResponse.json({ message, code }, { status: conflict ? 409 : 500 });
  }
}
