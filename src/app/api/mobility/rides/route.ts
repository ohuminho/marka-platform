import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import { mobilityLifecycleService } from "@/services/mobility/orchestration/mobility-lifecycle.service";

import type { MobilitySafetyMode } from "@/services/mobility/orchestration/mobility-lifecycle.types";

import {
  MobilityRideService,
} from "@/services/mobility/rides/mobility-ride.service";

const mobilityRideService =
  new MobilityRideService();

export async function POST(
  request: Request
) {
  const authentication =
    await authenticateMobilityRequest(
      request
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const body =
      await request.json();

    const serviceType =
      typeof body?.serviceType ===
      "string"
        ? body.serviceType.trim()
        : "";

    const currency =
      typeof body?.currency ===
      "string"
        ? body.currency
            .trim()
            .toUpperCase()
        : "AOA";

    const idempotencyKey =
      getIdempotencyKey(
        request,
        body
      );

    const requestContext =
      getRequestContext(
        request
      );

    if (!serviceType) {
      return NextResponse.json(
        {
          message:
            "Mobility service type is required.",

          code:
            "MOBILITY_SERVICE_TYPE_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          message:
            "Idempotency key is required.",

          code:
            "IDEMPOTENCY_KEY_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const safetyMode =
      normalizeSafetyMode(
        body?.safetyMode
      );

    if (!safetyMode) {
      return NextResponse.json(
        {
          message:
            "safetyMode must be STANDARD, TRUSTED, or CHILD.",

          code:
            "INVALID_SAFETY_MODE",
        },
        {
          status: 400,
        }
      );
    }

    const ride =
      await mobilityRideService.create({
        organizationId:
          authentication.session
            .organizationId,

        riderId:
          authentication.session
            .userId,

        serviceType,

        currency,

        pickupLatitude:
          Number(
            body?.pickupLatitude
          ),

        pickupLongitude:
          Number(
            body?.pickupLongitude
          ),

        pickupAddress:
          typeof body?.pickupAddress ===
          "string"
            ? body.pickupAddress.trim()
            : undefined,

        dropoffLatitude:
          Number(
            body?.dropoffLatitude
          ),

        dropoffLongitude:
          Number(
            body?.dropoffLongitude
          ),

        dropoffAddress:
          typeof body?.dropoffAddress ===
          "string"
            ? body.dropoffAddress.trim()
            : undefined,

        stops:
          Array.isArray(
            body?.stops
          )
            ? body.stops
            : undefined,

        metadata: {
          ...(
            body?.metadata &&
            typeof body.metadata ===
              "object" &&
            !Array.isArray(
              body.metadata
            )
              ? body.metadata
              : {}
          ),

          safetyMode,
        },
      });

    const orchestration =
      await mobilityLifecycleService.initialize({
        organizationId:
          authentication.session
            .organizationId,

        rideId:
          ride.id,

        actorUserId:
          authentication.session
            .userId,

        correlationId:
          requestContext.correlationId,

        requestId:
          requestContext.requestId,

        idempotencyKey:
          `${idempotencyKey}:orchestration`,

        ipAddress:
          requestContext.ipAddress,

        userAgent:
          requestContext.userAgent,

        safetyMode,
      });

    return NextResponse.json(
      {
        ride,

        orchestration,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_CREATE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Mobility ride.";

    return NextResponse.json(
      {
        message:
          message ||
          "Unable to create Mobility ride.",

        code:
          "MOBILITY_RIDE_CREATION_FAILED",
      },
      {
        status: 400,
      }
    );
  }
}

export async function GET(
  request: Request
) {
  const authentication =
    await authenticateMobilityRequest(
      request
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const ride =
      await mobilityRideService.getActiveRideForRider(
        authentication.session
          .userId
      );

    if (
      ride &&
      ride.organizationId !==
        authentication.session
          .organizationId
    ) {
      return NextResponse.json(
        {
          ride: null,
        },
        {
          status: 200,
        }
      );
    }

    const orchestration =
      ride
        ? await mobilityLifecycleService.get(
            authentication.session
              .organizationId,

            ride.id
          )
        : null;

    return NextResponse.json({
      ride,

      orchestration,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_ACTIVE_RIDE_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to retrieve active Mobility ride.",

        code:
          "MOBILITY_ACTIVE_RIDE_RETRIEVAL_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizeSafetyMode(
  value: unknown
): MobilitySafetyMode | null {
  if (
    typeof value !==
    "string"
  ) {
    return "STANDARD";
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    normalized ===
      "STANDARD" ||
    normalized ===
      "TRUSTED" ||
    normalized ===
      "CHILD"
  ) {
    return normalized;
  }

  return null;
}
