import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilityFinancialRecoveryService,
} from "@/services/mobility/recovery/mobility-financial-recovery.service";

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

  const { id: rideId } =
    await context.params;

  if (!rideId?.trim()) {
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
        rideId
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
      authentication.session.organizationId
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

    const reconciliation =
      await mobilityFinancialRecoveryService
        .reconcile({
          organizationId:
            authentication.session.organizationId,

          rideId,

          actorUserId:
            authentication.session.userId,
        });

    return NextResponse.json(
      {
        rideId,
        reconciliation,
      },
      {
        status:
          reconciliation.reconciled
            ? 200
            : 409,
      }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_FINANCIAL_RECONCILIATION_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to reconcile Mobility financials.",

        code:
          "MOBILITY_FINANCIAL_RECONCILIATION_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
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

  const { id: rideId } =
    await context.params;

  if (!rideId?.trim()) {
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

  const ride =
    await mobilityRideService.getById(
      rideId
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
    authentication.session.organizationId
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

  let body:
    Record<string, unknown> = {};

  try {
    const parsed =
      await request.json();

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      body =
        parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const idempotencyKey =
    getIdempotencyKey(
      request,
      body
    );

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

  const requestContext =
    getRequestContext(
      request
    );

  const finalFareMinor =
    parseBigInt(
      body.finalFareMinor
    );

  const availableDigitalProceedsMinor =
    parseOptionalBigInt(
      body.availableDigitalProceedsMinor
    );

  if (
    body.finalFareMinor !==
      undefined &&
    finalFareMinor === null
  ) {
    return NextResponse.json(
      {
        message:
          "finalFareMinor must be a valid non-negative integer.",
        code:
          "INVALID_FINAL_FARE",
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.availableDigitalProceedsMinor !==
      undefined &&
    availableDigitalProceedsMinor === null
  ) {
    return NextResponse.json(
      {
        message:
          "availableDigitalProceedsMinor must be a valid non-negative integer.",
        code:
          "INVALID_DIGITAL_PROCEEDS",
      },
      {
        status: 400,
      }
    );
  }

  const result =
    await mobilityFinancialRecoveryService
      .recover({
        organizationId:
          authentication.session.organizationId,

        rideId,

        actorUserId:
          authentication.session.userId,

        correlationId:
          requestContext.correlationId,

        requestId:
          requestContext.requestId,

        ipAddress:
          requestContext.ipAddress,

        userAgent:
          requestContext.userAgent,

        finalFareMinor:
          finalFareMinor ??
          undefined,

        availableDigitalProceedsMinor:
          availableDigitalProceedsMinor ??
          undefined,

        sourceReference:
          typeof body.sourceReference ===
          "string"
            ? body.sourceReference.trim()
            : undefined,

        paymentIdempotencyKey:
          typeof body.paymentIdempotencyKey ===
          "string"
            ? body.paymentIdempotencyKey.trim()
            : `${idempotencyKey}:payment`,

        settlementIdempotencyKey:
          typeof body.settlementIdempotencyKey ===
          "string"
            ? body.settlementIdempotencyKey.trim()
            : `${idempotencyKey}:settlement`,

        settlementCompletionIdempotencyKey:
          typeof body.settlementCompletionIdempotencyKey ===
          "string"
            ? body.settlementCompletionIdempotencyKey.trim()
            : `${idempotencyKey}:settlement-complete`,

        metadata:
          isRecord(body.metadata)
            ? body.metadata
            : undefined,
      });

  return NextResponse.json(
    result,
    {
      status:
        result.recovered
          ? 200
          : result.status ===
            "MISMATCH"
            ? 409
            : 202,
    }
  );
}

function parseBigInt(
  value: unknown
): bigint | null {
  if (
    typeof value === "number"
  ) {
    if (
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      return null;
    }

    return BigInt(value);
  }

  if (
    typeof value === "string" &&
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

function parseOptionalBigInt(
  value: unknown
): bigint | null | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  return parseBigInt(value);
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
  }
