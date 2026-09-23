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

    if (
      ride.riderId !==
      authentication.session.userId
    ) {
      return NextResponse.json(
        {
          message:
            "Only the rider can share this trip.",
          code:
            "TRIP_SHARE_OWNER_REQUIRED",
        },
        { status: 403 }
      );
    }

    const recipientName =
      typeof body?.recipientName === "string"
        ? body.recipientName.trim()
        : "";

    const recipientPhone =
      typeof body?.recipientPhone === "string"
        ? body.recipientPhone.trim()
        : undefined;

    if (!recipientName) {
      return NextResponse.json(
        {
          message:
            "Trip share recipient name is required.",
          code:
            "TRIP_SHARE_RECIPIENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    let expiresAt:
      | Date
      | undefined;

    if (
      typeof body?.expiresAt === "string"
    ) {
      const parsed =
        new Date(body.expiresAt);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Invalid trip share expiration.",
            code:
              "INVALID_TRIP_SHARE_EXPIRATION",
          },
          { status: 400 }
        );
      }

      expiresAt = parsed;
    }

    const share =
      await mobilitySafetyService.createTripShare({
        rideId:
          id,

        ownerUserId:
          authentication.session.userId,

        recipientName,

        recipientPhone,

        expiresAt,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json(
      {
        share,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_TRIP_SHARE_CREATE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create trip share.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_TRIP_SHARE_CREATION_FAILED",
      },
      { status: 409 }
    );
  }
}
