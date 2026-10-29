import { NextResponse } from "next/server";
import { MobilityAvailabilityStatus, MobilityRideStatus } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";

export const dynamic = "force-dynamic";

const ACTIVE_RIDE_STATUSES = [
  MobilityRideStatus.DRIVER_ASSIGNED,
  MobilityRideStatus.DRIVER_ARRIVING,
  MobilityRideStatus.DRIVER_ARRIVED,
  MobilityRideStatus.TRIP_STARTED,
  MobilityRideStatus.TRIP_IN_PROGRESS,
];

export async function GET(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const driver = await prisma.mobilityDriver.findFirst({
      where: { userId: auth.session.userId, organizationId: auth.session.organizationId },
      select: { id: true, status: true, displayName: true },
    });
    if (!driver) return NextResponse.json({ driver: null, availability: null });
    const availability = await prisma.mobilityDriverAvailability.findUnique({ where: { driverId: driver.id } });
    return NextResponse.json({ driver, availability }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("[MARKA_DRIVER_AVAILABILITY_GET_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível consultar a disponibilidade.", code: "DRIVER_AVAILABILITY_UNAVAILABLE" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  let requested: "AVAILABLE" | "OFFLINE";
  try {
    const body = await request.json();
    if (body?.status !== "AVAILABLE" && body?.status !== "OFFLINE") {
      return NextResponse.json({ message: "O estado deve ser AVAILABLE ou OFFLINE.", code: "INVALID_AVAILABILITY_STATUS" }, { status: 400 });
    }
    requested = body.status;
  } catch {
    return NextResponse.json({ message: "Corpo JSON inválido.", code: "INVALID_JSON_BODY" }, { status: 400 });
  }

  try {
    const driver = await prisma.mobilityDriver.findFirst({
      where: { userId: auth.session.userId, organizationId: auth.session.organizationId },
      include: {
        verifications: { select: { documentType: true, status: true, documentExpiry: true } },
        vehicles: {
          where: { isPrimary: true, activeUntil: null },
          include: { vehicle: { include: { verifications: { select: { documentType: true, status: true, documentExpiry: true } } } } },
        },
      },
    });
    if (!driver) return NextResponse.json({ message: "Perfil de motorista não encontrado.", code: "DRIVER_PROFILE_REQUIRED" }, { status: 404 });

    if (requested === "AVAILABLE" && driver.status !== "ACTIVE") {
      return NextResponse.json({ message: "O perfil de motorista tem de estar aprovado e ativo antes de aceitar viagens.", code: "DRIVER_NOT_ACTIVE" }, { status: 409 });
    }

    if (requested === "AVAILABLE") {
      const now = new Date();
      const requiredDriverDocuments = ["IDENTITY_DOCUMENT", "DRIVING_LICENSE", "CRIMINAL_RECORD"];
      const requiredVehicleDocuments = ["VEHICLE_REGISTRATION", "VEHICLE_OWNERSHIP", "VEHICLE_INSURANCE", "VEHICLE_INSPECTION", "VEHICLE_SERVICE_LICENSE"];
      const valid = (items: Array<{ documentType: string; status: string; documentExpiry: Date | null }>, type: string) =>
        items.some((item) => item.documentType === type && item.status === "VERIFIED" && (!item.documentExpiry || item.documentExpiry > now));
      const missingDriverDocuments = requiredDriverDocuments.filter((type) => !valid(driver.verifications, type));
      const primaryVehicle = driver.vehicles[0]?.vehicle;
      const missingVehicleDocuments = primaryVehicle
        ? requiredVehicleDocuments.filter((type) => !valid(primaryVehicle.verifications, type))
        : ["VEHICLE_NOT_REGISTERED"];
      if (!primaryVehicle || primaryVehicle.status !== "ACTIVE" || missingDriverDocuments.length || missingVehicleDocuments.length) {
        return NextResponse.json({
          message: "A candidatura não pode ficar online: faltam documentos atuais verificados ou a viatura ainda não foi aprovada.",
          code: "DRIVER_COMPLIANCE_INCOMPLETE",
          missingDriverDocuments,
          missingVehicleDocuments,
        }, { status: 409 });
      }
    }

    const activeRide = await prisma.mobilityRide.findFirst({
      where: { organizationId: auth.session.organizationId, driverId: driver.id, status: { in: ACTIVE_RIDE_STATUSES } },
      select: { id: true, status: true },
    });
    if (activeRide) {
      return NextResponse.json({ message: "Conclua ou regularize a viagem atribuída antes de alterar a disponibilidade.", code: "DRIVER_HAS_ACTIVE_RIDE" }, { status: 409 });
    }

    const now = new Date();
    const availability = await prisma.mobilityDriverAvailability.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        status: requested === "AVAILABLE" ? MobilityAvailabilityStatus.AVAILABLE : MobilityAvailabilityStatus.OFFLINE,
        lastOnlineAt: requested === "AVAILABLE" ? now : null,
        lastOfflineAt: requested === "OFFLINE" ? now : null,
      },
      update: {
        status: requested === "AVAILABLE" ? MobilityAvailabilityStatus.AVAILABLE : MobilityAvailabilityStatus.OFFLINE,
        lastOnlineAt: requested === "AVAILABLE" ? now : undefined,
        lastOfflineAt: requested === "OFFLINE" ? now : undefined,
      },
    });

    return NextResponse.json({ status: availability.status, availability });
  } catch (error) {
    console.error("[MARKA_DRIVER_AVAILABILITY_PATCH_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível atualizar a disponibilidade.", code: "DRIVER_AVAILABILITY_UPDATE_FAILED" }, { status: 500 });
  }
}
