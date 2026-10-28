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
      select: { id: true, status: true },
    });
    if (!driver) return NextResponse.json({ message: "Perfil de motorista não encontrado.", code: "DRIVER_PROFILE_REQUIRED" }, { status: 404 });

    if (requested === "AVAILABLE" && driver.status !== "ACTIVE") {
      return NextResponse.json({ message: "O perfil de motorista tem de estar aprovado e ativo antes de aceitar viagens.", code: "DRIVER_NOT_ACTIVE" }, { status: 409 });
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
