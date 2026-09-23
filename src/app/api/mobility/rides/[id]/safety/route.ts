import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  prisma,
} from "@/database/client/prisma";

import {
  mobilitySafetyService,
} from "@/services/mobility/safety/mobility-safety.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id } =
    await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      {
        message:
          "Ride id is required.",
        code:
          "RIDE_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driver: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!ride) {
      return NextResponse.json(
        {
          message:
            "Mobility ride not found.",
          code:
            "RIDE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      ride.organizationId !==
      authentication.session.organizationId
    ) {
      return NextResponse.json(
        {
          message:
            "Mobility ride organization access denied.",
          code:
            "RIDE_ORGANIZATION_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const isRider =
      ride.riderId ===
      authentication.session.userId;

    const isDriver =
      ride.driver?.userId ===
      authentication.session.userId;

    if (!isRider && !isDriver) {
      return NextResponse.json(
        {
          message:
            "You do not have access to this ride safety information.",
          code:
            "RIDE_SAFETY_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const safety =
      await mobilitySafetyService.getTripSafety(
        id
      );

    return NextResponse.json({
      safety,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_SAFETY_GET_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to retrieve ride safety.",
        code:
          "MOBILITY_RIDE_SAFETY_RETRIEVAL_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id } =
    await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      {
        message:
          "Ride id is required.",
        code:
          "RIDE_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    const body =
      await request.json();

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driver: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!ride) {
      return NextResponse.json(
        {
          message:
            "Mobility ride not found.",
          code:
            "RIDE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      ride.organizationId !==
      authentication.session.organizationId
    ) {
      return NextResponse.json(
        {
          message:
            "Mobility ride organization access denied.",
          code:
            "RIDE_ORGANIZATION_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const isRider =
      ride.riderId ===
      authentication.session.userId;

    const isDriver =
      ride.driver?.userId ===
      authentication.session.userId;

    if (!isRider && !isDriver) {
      return NextResponse.json(
        {
          message:
            "You do not have access to this ride.",
          code:
            "RIDE_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const mode =
      typeof body?.mode === "string"
        ? body.mode.trim().toUpperCase()
        : "";

    if (
      mode !== "STANDARD" &&
      mode !== "TRUSTED" &&
      mode !== "CHILD"
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid Mobility safety mode.",
          code:
            "INVALID_SAFETY_MODE",
        },
        { status: 400 }
      );
    }

    const safety =
      await mobilitySafetyService.createTripSafety({
        organizationId:
          authentication.session.organizationId,

        rideId:
          id,

        riderId:
          ride.riderId,

        mode,

        childRide:
          Boolean(body?.childRide),

        trustedRide:
          Boolean(body?.trustedRide),

        pinRequired:
          typeof body?.pinRequired === "boolean"
            ? body.pinRequired
            : undefined,

        audioSafetyEnabled:
          typeof body?.audioSafetyEnabled === "boolean"
            ? body.audioSafetyEnabled
            : undefined,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json(
      {
        safety,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_SAFETY_CREATE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to configure ride safety.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_RIDE_SAFETY_CONFIGURATION_FAILED",
      },
      { status: 409 }
    );
  }
}
