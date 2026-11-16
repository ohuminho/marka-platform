import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import { canAcceptAdditionalFreightAssignment } from "@/freight-engine/freight-provider-availability";
import { canVehicleCarryCombinedQuantities, canVehicleCarryQuantity } from "@/freight-engine/freight-capacity";
import { isFreshAccurateProviderLocation } from "@/freight-engine/freight-geography";

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

  if (!isFreshAccurateProviderLocation({
    latitude: provider.currentLatitude === null ? null : Number(provider.currentLatitude),
    longitude: provider.currentLongitude === null ? null : Number(provider.currentLongitude),
    accuracyMeters: provider.locationAccuracyMeters === null ? null : Number(provider.locationAccuracyMeters),
    updatedAt: provider.locationUpdatedAt,
  })) {
    return NextResponse.json({
      message: "Actualize a sua localização GPS com precisão suficiente antes de aceitar um serviço.",
      code: "FREIGHT_PROVIDER_LOCATION_STALE",
    }, { status: 409 });
  }

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
  if (freight.requestType === "CARGO_SHIPMENT") {
    const capacityMatches = canVehicleCarryQuantity(
      vehicle.capacity === null ? null : Number(vehicle.capacity),
      vehicle.capacityUnit,
      freight.quantity === null ? null : Number(freight.quantity),
      freight.quantityUnit,
    );
    if (!capacityMatches) {
      return NextResponse.json(
        { message: "A capacidade registada desta viatura não cobre a quantidade e unidade solicitadas.", code: "CARGO_VEHICLE_CAPACITY_MISMATCH" },
        { status: 409 },
      );
    }
  }

  if (freight.requestType === "WATER_DELIVERY") {
    const details = freight.details && typeof freight.details === "object" ? freight.details as Record<string, unknown> : {};
    const capacityMatches = canVehicleCarryQuantity(
      vehicle.capacity === null ? null : Number(vehicle.capacity),
      vehicle.capacityUnit,
      freight.quantity === null ? null : Number(freight.quantity),
      freight.quantityUnit,
    );
    if (vehicle.kind !== "WATER_TANKER" || vehicle.waterType !== details.waterType || !capacityMatches) {
      return NextResponse.json(
        { message: "A cisterna não corresponde ao tipo de água ou ao volume solicitado.", code: "WATER_TANKER_CAPACITY_MISMATCH" },
        { status: 409 },
      );
    }
  }

  try {
    const assigned = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${provider.id}))`;

      if (freight.requestType === "CARGO_SHIPMENT" || freight.requestType === "WATER_DELIVERY") {
        const activeVehicleJobs = await tx.freightRequest.findMany({
          where: {
            organizationId: auth.session.organizationId,
            assignedProviderId: provider.id,
            assignedVehicleId: vehicle.id,
            requestType: freight.requestType,
            status: { in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"] },
          },
          select: { quantity: true, quantityUnit: true },
        });
        const reservedQuantities = [
          ...activeVehicleJobs.map((job) => ({
            quantity: job.quantity === null ? null : Number(job.quantity),
            unit: job.quantityUnit,
          })),
          { quantity: freight.quantity === null ? null : Number(freight.quantity), unit: freight.quantityUnit },
        ];
        const combinedCapacityMatches = canVehicleCarryCombinedQuantities(
          vehicle.capacity === null ? null : Number(vehicle.capacity),
          vehicle.capacityUnit,
          reservedQuantities,
        );
        if (!combinedCapacityMatches) throw new Error("VEHICLE_COMBINED_CAPACITY_EXCEEDED");
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
    const conflict = code === "PROVIDER_ALREADY_CLAIMED" || code === "REQUEST_ALREADY_ASSIGNED_OR_UNPAID" || code === "VEHICLE_COMBINED_CAPACITY_EXCEEDED";
    return NextResponse.json({ message: code === "VEHICLE_COMBINED_CAPACITY_EXCEEDED" ? "A quantidade deste pedido, somada às cargas activas nesta viatura, ultrapassa a capacidade registada. Escolha outra viatura ou conclua uma entrega antes." : conflict ? "Este pedido ou prestador já foi atribuído. Actualize a lista." : "Não foi possível atribuir o pedido.", code }, { status: conflict ? 409 : 500 });
  }
}
