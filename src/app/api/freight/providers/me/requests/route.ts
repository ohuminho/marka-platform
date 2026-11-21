import { NextResponse } from "next/server";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import { canAcceptAdditionalFreightAssignment } from "@/freight-engine/freight-provider-availability";
import { canVehicleCarryQuantity } from "@/freight-engine/freight-capacity";
import { haversineDistanceKm, isFreshAccurateProviderLocation } from "@/freight-engine/freight-geography";

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

  if (!provider) return NextResponse.json({ requests: [], assignedRequests: [], providerRegistrationRequired: true, message: "Registe o seu perfil de prestador para começar a receber pedidos." });
  if (provider.status !== "VERIFIED") return NextResponse.json({ requests: [], assignedRequests: [], message: "A conta aguarda verificação." });

  const providerHasFreshLocation = isFreshAccurateProviderLocation({
    latitude: provider.currentLatitude === null ? null : Number(provider.currentLatitude),
    longitude: provider.currentLongitude === null ? null : Number(provider.currentLongitude),
    accuracyMeters: provider.locationAccuracyMeters === null ? null : Number(provider.locationAccuracyMeters),
    updatedAt: provider.locationUpdatedAt,
  });

  const requestTypes = provider.serviceTypes;
  const eligibleTypes = requestTypes.filter((type) => provider.vehicles.some((vehicle) => compatibleKinds[type].includes(vehicle.kind as never)));

  // Do not advertise new work when the provider cannot pass the same fresh-GPS
  // eligibility check enforced by the transactional accept endpoint. Existing
  // assignments remain visible and are never cancelled because GPS went stale.
  const requests = providerHasFreshLocation && canAcceptAdditionalFreightAssignment(provider.availability) && eligibleTypes.length > 0 ? await prisma.freightRequest.findMany({
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

  const matched = requests.filter((item) => provider.vehicles.some((vehicle) => {
    if (!compatibleKinds[item.requestType].includes(vehicle.kind as never)) return false;
    const requestDetails = item.details && typeof item.details === "object" ? item.details as Record<string, unknown> : {};
    if (typeof requestDetails.vehiclePreference === "string" && requestDetails.vehiclePreference !== "ANY" && vehicle.kind !== requestDetails.vehiclePreference) return false;
    if (item.requestType === "CARGO_SHIPMENT") {
      return canVehicleCarryQuantity(
        vehicle.capacity === null ? null : Number(vehicle.capacity),
        vehicle.capacityUnit,
        item.quantity === null ? null : Number(item.quantity),
        item.quantityUnit,
      );
    }
    if (item.requestType === "WATER_DELIVERY") {
      const details = item.details && typeof item.details === "object" ? item.details as Record<string, unknown> : {};
      if (vehicle.waterType !== details.waterType) return false;
      return canVehicleCarryQuantity(
        vehicle.capacity === null ? null : Number(vehicle.capacity),
        vehicle.capacityUnit,
        item.quantity === null ? null : Number(item.quantity),
        item.quantityUnit,
      );
    }
    return true;
  }));

  const rankedMatched = matched.map((item) => ({
    item,
    pickupDistanceKm: item.originLatitude !== null && item.originLongitude !== null
      ? haversineDistanceKm(
          { latitude: Number(provider.currentLatitude), longitude: Number(provider.currentLongitude) },
          { latitude: Number(item.originLatitude), longitude: Number(item.originLongitude) },
        )
      : null,
  })).sort((a, b) => {
    if (a.pickupDistanceKm !== null && b.pickupDistanceKm !== null) return a.pickupDistanceKm - b.pickupDistanceKm;
    if (a.pickupDistanceKm !== null) return -1;
    if (b.pickupDistanceKm !== null) return 1;
    return (a.item.paidAt?.getTime() ?? 0) - (b.item.paidAt?.getTime() ?? 0);
  });

  const assignedRequests = await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.session.organizationId,
      assignedProviderId: provider.id,
      status: { in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION", "PROVIDER_COMPLETED_PENDING_CONFIRMATION"] },
    },
    orderBy: { assignedAt: "asc" },
    take: 50,
  });

  const serialize = (item: (typeof requests)[number], pickupDistanceKm: number | null = null) => ({
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
    pickupDistanceKm,
  });

  return NextResponse.json({
    requests: rankedMatched.map(({ item, pickupDistanceKm }) => serialize(item, pickupDistanceKm)),
    assignedRequests: assignedRequests.map(serialize),
    ...(providerHasFreshLocation ? {} : {
      code: "FREIGHT_PROVIDER_LOCATION_STALE",
      message: "Actualize a sua localização GPS para receber novos pedidos. Os serviços já atribuídos continuam disponíveis.",
    }),
  });
}
