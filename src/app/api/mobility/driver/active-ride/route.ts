import { NextResponse } from "next/server";
import { MobilityRideStatus } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { mobilityLifecycleService } from "@/services/mobility/orchestration/mobility-lifecycle.service";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [
  MobilityRideStatus.REQUESTED,
  MobilityRideStatus.SEARCHING,
  MobilityRideStatus.MATCHED,
  MobilityRideStatus.DRIVER_ASSIGNED,
  MobilityRideStatus.DRIVER_ARRIVING,
  MobilityRideStatus.DRIVER_ARRIVED,
  MobilityRideStatus.TRIP_STARTED,
  MobilityRideStatus.TRIP_IN_PROGRESS,
];

export async function GET(request: Request) {
  const authentication = await authenticateMobilityRequest(request);
  if (!authentication.ok) return authentication.response;

  try {
    const driver = await prisma.mobilityDriver.findFirst({
      where: {
        userId: authentication.session.userId,
        organizationId: authentication.session.organizationId,
      },
      select: { id: true },
    });

    if (!driver) {
      return NextResponse.json({ ride: null, orchestration: null });
    }

    const ride = await prisma.mobilityRide.findFirst({
      where: {
        organizationId: authentication.session.organizationId,
        driverId: driver.id,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { requestedAt: "desc" },
      include: {
        rider: { select: { id: true, name: true } },
        driver: {
          include: {
            user: { select: { id: true, name: true } },
            location: true,
            availability: true,
          },
        },
        vehicle: true,
        stops: { orderBy: { sequence: "asc" } },
      },
    });

    const orchestration = ride
      ? await mobilityLifecycleService.get(authentication.session.organizationId, ride.id)
      : null;

    return NextResponse.json(
      { ride, orchestration },
      { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("[MARKA_DRIVER_ACTIVE_RIDE_ERROR]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar a viagem ativa.", code: "DRIVER_ACTIVE_RIDE_UNAVAILABLE" },
      { status: 500 },
    );
  }
}
