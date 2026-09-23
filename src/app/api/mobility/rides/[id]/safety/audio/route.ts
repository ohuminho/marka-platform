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

    const action =
      typeof body?.action === "string"
        ? body.action.trim().toUpperCase()
        : "START";

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

    if (action === "STOP") {
      await mobilitySafetyService.stopAudioSafety({
        rideId:
          id,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

      return NextResponse.json({
        audioSafety: {
          rideId:
            id,
          status:
            "COMPLETED",
        },
      });
    }

    const provider =
      typeof body?.provider === "string"
        ? body.provider.trim()
        : undefined;

    const providerReference =
      typeof body?.providerReference === "string"
        ? body.providerReference.trim()
        : undefined;

    let retentionUntil:
      | Date
      | undefined;

    if (
      typeof body?.retentionUntil === "string"
    ) {
      const parsed =
        new Date(
          body.retentionUntil
        );

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Invalid audio retention date.",
            code:
              "INVALID_AUDIO_RETENTION_DATE",
          },
          { status: 400 }
        );
      }

      retentionUntil =
        parsed;
    }

    const session =
      await mobilitySafetyService.startAudioSafety({
        rideId:
          id,

        startedByUserId:
          authentication.session.userId,

        provider,

        providerReference,

        retentionUntil,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json(
      {
        audioSafety:
          session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_AUDIO_SAFETY_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to manage audio safety.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_AUDIO_SAFETY_OPERATION_FAILED",
      },
      { status: 409 }
    );
  }
}
