import { NextResponse } from "next/server";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

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

  const requests = await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.session.organizationId,
      requestType: { in: eligibleTypes },
      status: { in: ["PAID", "SEARCHING_PROVIDER"] },
      paidAt: { not: null },
      assignedProviderId: null,
    },
    orderBy: { paidAt: "asc" },
    take: 50,
  });

  const matched = requests.filter((item) => provider.vehicles.some((vehicle) => {
    if (!compatibleKinds[item.requestType].includes(vehicle.kind as never)) return false;
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
    requests: matched.map(serialize),
    assignedRequests: assignedRequests.map(serialize),
  });
}
