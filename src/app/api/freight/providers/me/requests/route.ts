import { NextResponse } from "next/server";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import {
  canAcceptAdditionalFreightAssignment,
  canAcceptFreightAlongsideActiveAssignments,
} from "@/freight-engine/freight-provider-availability";
import {
  isFreightProviderLocationFresh,
  isWithinFreightPickupRadius,
} from "@/freight-engine/freight-proximity";

const compatibleKinds = {
  CARGO_SHIPMENT: ["CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "SPECIALIZED"],
  WATER_DELIVERY: ["WATER_TANKER"],
  ROADSIDE_ASSISTANCE: ["TOW_TRUCK", "SERVICE_VEHICLE"],
} as const;

export async function GET(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const provider = await prisma.freightProvider.findUnique({
    where: { organizationId_userId: { organizationId: auth.session.organizationId, userId: auth.session.userId } },
    include: { vehicles: { where: { status: "ACTIVE" } } },
  });

  if (!provider) return NextResponse.json({ message: "Prestador não encontrado.", code: "FREIGHT_PROVIDER_NOT_FOUND" }, { status: 404 });
  if (provider.status !== "VERIFIED") return NextResponse.json({ requests: [], message: "A conta aguarda verificação." });

  const requestTypes = provider.serviceTypes;
  const eligibleTypes = requestTypes.filter((type) => provider.vehicles.some((vehicle) => compatibleKinds[type].includes(vehicle.kind as never)));

  const locationReady =
    provider.currentLatitude !== null &&
    provider.currentLongitude !== null &&
    provider.locationAccuracyM !== null &&
    provider.locationAccuracyM <= 1000 &&
    isFreightProviderLocationFresh(provider.locationUpdatedAt);

  const requests = canAcceptAdditionalFreightAssignment(provider.availability) && locationReady && eligibleTypes.length > 0 ? await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.session.organizationId,
      requestType: { in: eligibleTypes },
      status: { in: ["PAID", "SEARCHING_PROVIDER"] },
      paidAt: { not: null },
      assignedProviderId: null,
    },
    orderBy: { paidAt: "asc" },
    take: 50,
  }) : [];

  const nearby = requests.filter((item) => {
    const pickupLatitude = item.originLatitude ?? item.destinationLatitude;
    const pickupLongitude = item.originLongitude ?? item.destinationLongitude;
    if (pickupLatitude === null || pickupLongitude === null) return false;
    return isWithinFreightPickupRadius(
      { latitude: Number(provider.currentLatitude), longitude: Number(provider.currentLongitude) },
      { latitude: Number(pickupLatitude), longitude: Number(pickupLongitude) },
    );
  });

  const matched = nearby.filter((item) => provider.vehicles.some((vehicle) => {
    if (!compatibleKinds[item.requestType].includes(vehicle.kind as never)) return false;
    const requestDetails = item.details && typeof item.details === "object" ? item.details as Record<string, unknown> : {};
    if (typeof requestDetails.vehiclePreference === "string" && requestDetails.vehiclePreference !== "ANY" && vehicle.kind !== requestDetails.vehiclePreference) return false;
    if (item.requestType !== "WATER_DELIVERY") return true;
    const details = item.details && typeof item.details === "object" ? item.details as Record<string, unknown> : {};
    if (vehicle.waterType !== details.waterType) return false;
    if (!vehicle.capacity || !vehicle.capacityUnit || !item.quantity || !item.quantityUnit) return false;
    const capacityLitres = Number(vehicle.capacity) * (vehicle.capacityUnit === "M3" ? 1000 : 1);
    const requestedLitres = Number(item.quantity) * (item.quantityUnit === "M3" ? 1000 : 1);
    return ["M3", "LITRE"].includes(vehicle.capacityUnit) && ["M3", "LITRE"].includes(item.quantityUnit) && capacityLitres >= requestedLitres;
  }));

  const assignedRequests = await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.session.organizationId,
      assignedProviderId: provider.id,
      status: { in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"] },
    },
    orderBy: { assignedAt: "asc" },
    take: 50,
  });

  const eligibleRequests = assignedRequests.length === 0
    ? matched
    : matched.filter((candidate) => {
        if (candidate.requestType !== "WATER_DELIVERY") return false;
        const details = candidate.details && typeof candidate.details === "object"
          ? candidate.details as Record<string, unknown>
          : {};
        return provider.vehicles.some((vehicle) =>
          canAcceptFreightAlongsideActiveAssignments({
            activeAssignments: assignedRequests.map((active) => ({
              requestType: active.requestType,
              assignedVehicleId: active.assignedVehicleId,
              quantity: active.quantity === null ? null : Number(active.quantity),
              quantityUnit: active.quantityUnit,
              destinationLatitude: active.destinationLatitude === null ? null : Number(active.destinationLatitude),
              destinationLongitude: active.destinationLongitude === null ? null : Number(active.destinationLongitude),
              details: active.details,
            })),
            candidate: {
              requestType: candidate.requestType,
              assignedVehicleId: vehicle.id,
              quantity: candidate.quantity === null ? null : Number(candidate.quantity),
              quantityUnit: candidate.quantityUnit,
              destinationLatitude: candidate.destinationLatitude === null ? null : Number(candidate.destinationLatitude),
              destinationLongitude: candidate.destinationLongitude === null ? null : Number(candidate.destinationLongitude),
              details,
            },
            vehicle: {
              id: vehicle.id,
              kind: vehicle.kind,
              capacity: vehicle.capacity,
              capacityUnit: vehicle.capacityUnit,
              waterType: vehicle.waterType,
            },
          }),
        );
      });

  const serialize = (item: (typeof requests)[number]) => ({
    id: item.id,
    reference: item.reference,
    requestType: item.requestType,
    status: item.status,
    origin: item.originLatitude === null ? null : { latitude: Number(item.originLatitude), longitude: Number(item.originLongitude), address: item.originAddress },
    destination: item.destinationLatitude === null ? null : { latitude: Number(item.destinationLatitude), longitude: Number(item.destinationLongitude), address: item.destinationAddress },
    quantity: item.quantity === null ? null : Number(item.quantity),
    quantityUnit: item.quantityUnit,
    currency: item.currency,
    details: item.details,
    paidAt: item.paidAt,
    assignedAt: item.assignedAt,
  });

  return NextResponse.json({
    requests: eligibleRequests.map(serialize),
    assignedRequests: assignedRequests.map(serialize),
  });
}
