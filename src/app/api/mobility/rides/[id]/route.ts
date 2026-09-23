import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilityLifecycleService,
} from "@/services/mobility/orchestration/mobility-lifecycle.service";

import type {
  MobilityLifecycleAction,
  MobilitySafetyMode,
} from "@/services/mobility/orchestration/mobility-lifecycle.types";

import {
  MobilityRideService,
} from "@/services/mobility/rides/mobility-ride.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const mobilityRideService =
  new MobilityRideService();

export async function GET(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(
      request
    );

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
      {
        status: 400,
      }
    );
  }

  try {
    const ride =
      await mobilityRideService.getById(
        id
      );

    if (!ride) {
      return NextResponse.json(
        {
          message:
            "Mobility ride not found.",

          code:
            "RIDE_NOT_FOUND",
        },
        {
          status: 404,
        }
      );
    }

    if (
      ride.organizationId !==
      authentication.session
        .organizationId
    ) {
      return NextResponse.json(
        {
          message:
            "Mobility ride does not belong to the specified organization.",

          code:
            "RIDE_ORGANIZATION_ACCESS_DENIED",
        },
        {
          status: 403,
        }
      );
    }

    const isRider =
      ride.riderId ===
      authentication.session
        .userId;

    const isDriver =
      ride.driver?.user?.id ===
      authentication.session
        .userId;

    if (
      !isRider &&
      !isDriver
    ) {
      return NextResponse.json(
        {
          message:
            "You do not have access to this Mobility ride.",

          code:
            "RIDE_ACCESS_DENIED",
        },
        {
          status: 403,
        }
      );
    }

    const orchestration =
      await mobilityLifecycleService.get(
        authentication.session
          .organizationId,

        ride.id
      );

    return NextResponse.json({
      ride,

      orchestration,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_GET_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to retrieve Mobility ride.",

        code:
          "MOBILITY_RIDE_RETRIEVAL_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(
      request
    );

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
      {
        status: 400,
      }
    );
  }

  let body:
    Record<
      string,
      unknown
    >;

  try {
    const parsed =
      await request.json();

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(
        parsed
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Request body must be an object.",

          code:
            "INVALID_REQUEST_BODY",
        },
        {
          status: 400,
        }
      );
    }

    body =
      parsed as Record<
        string,
        unknown
      >;
  } catch {
    return NextResponse.json(
      {
        message:
          "Invalid JSON request body.",

        code:
          "INVALID_JSON_BODY",
      },
      {
        status: 400,
      }
    );
  }

  const action =
    typeof body.action ===
    "string"
      ? body.action
          .trim()
          .toUpperCase()
      : "";

  const idempotencyKey =
    getIdempotencyKey(
      request,
      body
    );

  const requestContext =
    getRequestContext(
      request
    );

  if (!action) {
    return NextResponse.json(
      {
        message:
          "Mobility ride action is required.",

        code:
          "RIDE_ACTION_REQUIRED",
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

  const ride =
    await mobilityRideService.getById(
      id
    );

  if (!ride) {
    return NextResponse.json(
      {
        message:
          "Mobility ride not found.",

        code:
          "RIDE_NOT_FOUND",
      },
      {
        status: 404,
      }
    );
  }

  if (
    ride.organizationId !==
    authentication.session
      .organizationId
  ) {
    return NextResponse.json(
      {
        message:
          "Mobility ride organization access denied.",

        code:
          "RIDE_ORGANIZATION_ACCESS_DENIED",
      },
      {
        status: 403,
      }
    );
  }

  const isRider =
    ride.riderId ===
    authentication.session
      .userId;

  const isDriver =
    ride.driver?.user?.id ===
    authentication.session
      .userId;

  const riderActions =
    new Set([
      "START_SEARCH",
      "SEARCH",
      "SAFETY_PRECHECK",
      "DISPATCH",
      "CANCEL",
    ]);

  if (
    riderActions.has(
      action
    ) &&
    !isRider
  ) {
    return NextResponse.json(
      {
        message:
          "Only the rider can perform this action.",

        code:
          "RIDER_ACTION_REQUIRED",
      },
      {
        status: 403,
      }
    );
  }

  const driverActions =
    new Set([
      "ACCEPT",
      "DRIVER_ACCEPT",
      "DRIVER_ARRIVING",
      "DRIVER_ARRIVED",
      "START_TRIP",
      "BEGIN_TRIP_PROGRESS",
      "COMPLETE",
      "RETRY_RECOVERY",
    ]);

  if (
    driverActions.has(
      action
    ) &&
    !isDriver
  ) {
    return NextResponse.json(
      {
        message:
          "Only the assigned driver can perform this action.",

        code:
          "DRIVER_ACTION_REQUIRED",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const lifecycleAction =
      normalizeLifecycleAction(
        action
      );

    if (!lifecycleAction) {
      return NextResponse.json(
        {
          message:
            `Unsupported Mobility ride action: ${action}.`,

          code:
            "UNSUPPORTED_RIDE_ACTION",
        },
        {
          status: 400,
        }
      );
    }

    const safetyMode =
      normalizeSafetyMode(
        body.safetyMode
      ) ??
      readSafetyMode(
        ride.metadata
      );

    if (!safetyMode) {
      return NextResponse.json(
        {
          message:
            "Invalid safety mode.",

          code:
            "INVALID_SAFETY_MODE",
        },
        {
          status: 400,
        }
      );
    }

    if (
      lifecycleAction ===
      "CANCEL"
    ) {
      const reason =
        typeof body.reason ===
        "string"
          ? body.reason.trim()
          : "";

      if (!reason) {
        return NextResponse.json(
          {
            message:
              "Cancellation reason is required.",

            code:
              "RIDE_CANCELLATION_REASON_REQUIRED",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      lifecycleAction ===
        "COMPLETE" ||
      lifecycleAction ===
        "RETRY_RECOVERY"
    ) {
      const finalFareMinor =
        parseBigInt(
          body.finalFareMinor
        );

      const estimatedFareMinor =
        parseBigInt(
          body.estimatedFareMinor ??
            body.finalFareMinor
        );

      if (
        finalFareMinor ===
          null ||
        estimatedFareMinor ===
          null
      ) {
        return NextResponse.json(
          {
            message:
              "finalFareMinor and estimatedFareMinor must be valid non-negative integers.",

            code:
              "INVALID_MOBILITY_FARE",
          },
          {
            status: 400,
          }
        );
      }

      const paymentMethod =
        typeof body.paymentMethod ===
        "string"
          ? body.paymentMethod
              .trim()
              .toUpperCase()
          : "";

      if (
        paymentMethod !==
          "CASH" &&
        paymentMethod !==
          "DIGITAL"
      ) {
        return NextResponse.json(
          {
            message:
              "Payment method must be CASH or DIGITAL.",

            code:
              "INVALID_MOBILITY_PAYMENT_METHOD",
          },
          {
            status: 400,
          }
        );
      }

      const paymentIdempotencyKey =
        typeof body.paymentIdempotencyKey ===
        "string"
          ? body.paymentIdempotencyKey.trim()
          : `${idempotencyKey}:payment`;

      const settlementIdempotencyKey =
        typeof body.settlementIdempotencyKey ===
        "string"
          ? body.settlementIdempotencyKey.trim()
          : `${idempotencyKey}:settlement`;

      const settlementCompletionIdempotencyKey =
        typeof body.settlementCompletionIdempotencyKey ===
        "string"
          ? body
              .settlementCompletionIdempotencyKey
              .trim()
          : `${idempotencyKey}:settlement-complete`;

      if (
        !paymentIdempotencyKey ||
        !settlementIdempotencyKey ||
        !settlementCompletionIdempotencyKey
      ) {
        return NextResponse.json(
          {
            message:
              "Payment and settlement idempotency keys are required.",

            code:
              "FINANCIAL_IDEMPOTENCY_KEYS_REQUIRED",
          },
          {
            status: 400,
          }
        );
      }

      const availableDigitalProceedsMinor =
        body.availableDigitalProceedsMinor !==
        undefined
          ? parseBigInt(
              body.availableDigitalProceedsMinor
            )
          : undefined;

      if (
        paymentMethod ===
          "DIGITAL" &&
        availableDigitalProceedsMinor ===
          null
      ) {
        return NextResponse.json(
          {
            message:
              "availableDigitalProceedsMinor must be a valid non-negative integer for DIGITAL payments.",

            code:
              "INVALID_DIGITAL_PROCEEDS",
          },
          {
            status: 400,
          }
        );
      }

      const result =
        await mobilityLifecycleService.execute({
          organizationId:
            authentication.session
              .organizationId,

          rideId:
            id,

          actorUserId:
            authentication.session
              .userId,

          correlationId:
            requestContext
              .correlationId,

          requestId:
            requestContext
              .requestId,

          idempotencyKey,

          ipAddress:
            requestContext.ipAddress,

          userAgent:
            requestContext.userAgent,

          safetyMode,

          metadata:
            isRecord(
              body.metadata
            )
              ? body.metadata
              : undefined,

          action:
            lifecycleAction,

          finalFareMinor,

          estimatedFareMinor,

          paymentMethod,

          availableDigitalProceedsMinor:
            availableDigitalProceedsMinor ??
            undefined,

          sourceReference:
            typeof body.sourceReference ===
            "string"
              ? body.sourceReference.trim()
              : undefined,

          paymentIdempotencyKey,

          settlementIdempotencyKey,

          settlementCompletionIdempotencyKey,

          pricingSnapshot:
            isRecord(
              body.pricingSnapshot
            )
              ? body.pricingSnapshot
              : undefined,
        });

      return NextResponse.json(
        {
          ride:
            result.ride ??
            await mobilityRideService.getById(
              id
            ),

          orchestration:
            result,

          financials:
            result.financials,
        },
        {
          status:
            result.recoveryRequired
              ? 202
              : 200,
        }
      );
    }

    const result =
      await mobilityLifecycleService.execute({
        organizationId:
          authentication.session
            .organizationId,

        rideId:
          id,

        actorUserId:
          authentication.session
            .userId,

        correlationId:
          requestContext
            .correlationId,

        requestId:
          requestContext
            .requestId,

        idempotencyKey,

        ipAddress:
          requestContext.ipAddress,

        userAgent:
          requestContext.userAgent,

        safetyMode,

        metadata:
          isRecord(
            body.metadata
          )
            ? body.metadata
            : undefined,

        action:
          lifecycleAction,

        reason:
          typeof body.reason ===
          "string"
            ? body.reason.trim()
            : undefined,
      });

    return NextResponse.json(
      {
        ride:
          result.ride ??
          await mobilityRideService.getById(
            id
          ),

        orchestration:
          result,
      },
      {
        status:
          result.recoveryRequired
            ? 202
            : 200,
      }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_LIFECYCLE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute Mobility ride lifecycle action.";

    return NextResponse.json(
      {
        message,

        code:
          "MOBILITY_RIDE_LIFECYCLE_ACTION_FAILED",
      },
      {
        status: 409,
      }
    );
  }
}

function normalizeLifecycleAction(
  action: string
): MobilityLifecycleAction | null {
  switch (action) {
    case "START_SEARCH":
    case "SEARCH":
      return "SEARCH";

    case "SAFETY_PRECHECK":
      return "SAFETY_PRECHECK";

    case "DISPATCH":
      return "DISPATCH";

    case "ACCEPT":
    case "DRIVER_ACCEPT":
      return "ACCEPT";

    case "DRIVER_ARRIVING":
      return "DRIVER_ARRIVING";

    case "DRIVER_ARRIVED":
      return "DRIVER_ARRIVED";

    case "START_TRIP":
      return "START_TRIP";

    case "BEGIN_TRIP_PROGRESS":
      return "BEGIN_TRIP_PROGRESS";

    case "COMPLETE":
      return "COMPLETE";

    case "CANCEL":
      return "CANCEL";

    case "RETRY_RECOVERY":
      return "RETRY_RECOVERY";

    default:
      return null;
  }
}

function normalizeSafetyMode(
  value: unknown
): MobilitySafetyMode | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
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

function readSafetyMode(
  metadata: unknown
): MobilitySafetyMode | null {
  if (
    !isRecord(
      metadata
    )
  ) {
    return "STANDARD";
  }

  return (
    normalizeSafetyMode(
      metadata.safetyMode
    ) ??
    "STANDARD"
  );
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function parseBigInt(
  value: unknown
): bigint | null {
  if (
    typeof value ===
    "bigint"
  ) {
    return value >=
      BigInt(0)
      ? value
      : null;
  }

  if (
    typeof value ===
    "number"
  ) {
    return Number.isSafeInteger(
      value
    ) && value >= 0
      ? BigInt(value)
      : null;
  }

  if (
    typeof value ===
      "string" &&
    /^[0-9]+$/.test(
      value.trim()
    )
  ) {
    try {
      return BigInt(
        value.trim()
      );
    } catch {
      return null;
    }
  }

  return null;
}
