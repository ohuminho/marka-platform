import { NextResponse } from "next/server";
import { MobilityRideStatus } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";

export const dynamic = "force-dynamic";

const HISTORY_STATUSES = [
  MobilityRideStatus.TRIP_COMPLETED,
  MobilityRideStatus.CANCELLED,
  MobilityRideStatus.EXPIRED,
  MobilityRideStatus.NO_DRIVER_FOUND,
  MobilityRideStatus.FAILED,
  MobilityRideStatus.DISPUTED,
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
      return NextResponse.json({ rides: [], summary: { total: 0, completed: 0, cancelled: 0 } });
    }

    const rides = await prisma.mobilityRide.findMany({
      where: {
        organizationId: authentication.session.organizationId,
        driverId: driver.id,
        status: { in: HISTORY_STATUSES },
      },
      orderBy: [{ completedAt: "desc" }, { requestedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        reference: true,
        status: true,
        serviceType: true,
        currency: true,
        pickupAddress: true,
        dropoffAddress: true,
        requestedAt: true,
        startedAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });

    const completed = rides.filter((ride) => ride.status === MobilityRideStatus.TRIP_COMPLETED).length;
    const cancelled = rides.filter((ride) => [
      MobilityRideStatus.CANCELLED,
      MobilityRideStatus.EXPIRED,
      MobilityRideStatus.NO_DRIVER_FOUND,
      MobilityRideStatus.FAILED,
      MobilityRideStatus.DISPUTED,
    ].includes(ride.status)).length;

    return NextResponse.json(
      { rides, summary: { total: rides.length, completed, cancelled } },
      { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("[MARKA_DRIVER_HISTORY_ERROR]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o histórico de viagens.", code: "DRIVER_HISTORY_UNAVAILABLE" },
      { status: 500 },
    );
  }
}
