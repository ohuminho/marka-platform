import { NextResponse } from "next/server";
import { MobilityDriverStatus, MobilityRideStatus } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";

export const dynamic = "force-dynamic";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  const authentication = await authenticateMobilityRequest(request);
  if (!authentication.ok) return authentication.response;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ message: "Dados de localização inválidos.", code: "INVALID_LOCATION_BODY" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Corpo JSON inválido.", code: "INVALID_JSON_BODY" }, { status: 400 });
  }

  const { latitude, longitude, accuracyM, heading, speedKph } = body;
  if (!finite(latitude) || latitude < -90 || latitude > 90 || !finite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ message: "Coordenadas GPS inválidas.", code: "INVALID_GPS_COORDINATES" }, { status: 400 });
  }
  if (accuracyM !== undefined && accuracyM !== null && (!finite(accuracyM) || accuracyM < 0 || accuracyM > 100000)) {
    return NextResponse.json({ message: "Precisão GPS inválida.", code: "INVALID_GPS_ACCURACY" }, { status: 400 });
  }
  if (heading !== undefined && heading !== null && (!finite(heading) || heading < 0 || heading >= 360)) {
    return NextResponse.json({ message: "Orientação GPS inválida.", code: "INVALID_GPS_HEADING" }, { status: 400 });
  }
  if (speedKph !== undefined && speedKph !== null && (!finite(speedKph) || speedKph < 0 || speedKph > 400)) {
    return NextResponse.json({ message: "Velocidade GPS inválida.", code: "INVALID_GPS_SPEED" }, { status: 400 });
  }

  try {
    const driver = await prisma.mobilityDriver.findFirst({
      where: { userId: authentication.session.userId, organizationId: authentication.session.organizationId },
      include: { availability: true, vehicles: { where: { isPrimary: true, activeUntil: null }, select: { vehicleId: true } } },
    });
    if (!driver || driver.status !== MobilityDriverStatus.ACTIVE) {
      return NextResponse.json({ message: "É necessário ter um perfil de motorista ativo.", code: "ACTIVE_DRIVER_REQUIRED" }, { status: 403 });
    }

    const activeRide = await prisma.mobilityRide.findFirst({
      where: {
        organizationId: authentication.session.organizationId,
        driverId: driver.id,
        status: { in: [MobilityRideStatus.DRIVER_ASSIGNED, MobilityRideStatus.DRIVER_ARRIVING, MobilityRideStatus.DRIVER_ARRIVED, MobilityRideStatus.TRIP_STARTED, MobilityRideStatus.TRIP_IN_PROGRESS] },
      },
      select: { id: true },
    });
    if (driver.availability?.status !== "AVAILABLE" && !activeRide) {
      return NextResponse.json({ message: "A localização só é atualizada quando o motorista está disponível ou tem uma viagem ativa.", code: "DRIVER_LOCATION_NOT_ACTIVE" }, { status: 409 });
    }

    const location = await prisma.mobilityLocation.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        vehicleId: driver.vehicles[0]?.vehicleId ?? null,
        latitude,
        longitude,
        accuracyM: accuracyM == null ? null : accuracyM,
        heading: heading == null ? null : heading,
        speedKph: speedKph == null ? null : speedKph,
        source: "GPS",
        recordedAt: new Date(),
      },
      update: {
        vehicleId: driver.vehicles[0]?.vehicleId ?? null,
        latitude,
        longitude,
        accuracyM: accuracyM == null ? null : accuracyM,
        heading: heading == null ? null : heading,
        speedKph: speedKph == null ? null : speedKph,
        source: "GPS",
        recordedAt: new Date(),
      },
      select: { recordedAt: true, accuracyM: true },
    });

    return NextResponse.json(
      { ok: true, recordedAt: location.recordedAt, accuracyM: location.accuracyM },
      { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("[MARKA_DRIVER_LOCATION_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível atualizar a localização GPS.", code: "DRIVER_LOCATION_UNAVAILABLE" }, { status: 500 });
  }
}
