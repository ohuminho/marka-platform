import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  MobilityRideService,
} from "@/services/mobility/rides/mobility-ride.service";

import {
  mobilityFinancialRecoveryService,
} from "@/services/mobility/recovery/mobility-financial-recovery.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const mobilityRideService =
  new MobilityRideService();

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const authentication =
    await authenticateMobilityRequest(
      request,
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id: rideId } =
    await context.params;

  const ride =
    await mobilityRideService.getById(
      rideId,
    );

  if (!ride) {
    return NextResponse.json(
      {
        message:
          "Mobility ride not found.",
      },
      { status: 404 },
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
      },
      { status: 403 },
    );
  }

  try {
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
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to reconcile Mobility financials.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const authentication =
    await authenticateMobilityRequest(
      request,
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id: rideId } =
    await context.params;

  const ride =
    await mobilityRideService.getById(
      rideId,
    );

  if (!ride) {
    return NextResponse.json(
      {
        message:
          "Mobility ride not found.",
      },
      { status: 404 },
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
      },
      { status: 403 },
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
      body,
    );

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        message:
          "Idempotency key is required.",
      },
      { status: 400 },
    );
  }

  const requestContext =
    getRequestContext(
      request,
    );

  const finalFareMinor =
    parseBigInt(
      body.finalFareMinor,
    );

  const availableDigitalProceedsMinor =
    parseBigInt(
      body.availableDigitalProceedsMinor,
    );

  if (
    finalFareMinor ===
    null
  ) {
    return NextResponse.json(
      {
        message:
          "finalFareMinor must be a valid non-negative integer.",
      },
      { status: 400 },
    );
  }

  if (
    availableDigitalProceedsMinor ===
    null
  ) {
    return NextResponse.json(
      {
        message:
          "availableDigitalProceedsMinor must be a valid non-negative integer.",
      },
      { status: 400 },
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

        finalFareMinor,

        availableDigitalProceedsMinor,

        sourceReference:
          typeof body.sourceReference ===
          "string"
            ? body.sourceReference.trim()
            : undefined,

        paymentIdempotencyKey:
          `${idempotencyKey}:payment`,

        settlementIdempotencyKey:
          `${idempotencyKey}:settlement`,

        settlementCompletionIdempotencyKey:
          `${idempotencyKey}:settlement-complete`,

        metadata:
          isRecord(body.metadata)
            ? body.metadata
            : undefined,
      });

  return NextResponse.json(
    result,
    {
      status:
        result.reconciled
          ? 200
          : 409,
    },
  );
}

function parseBigInt(
  value: unknown,
): bigint | null {
  if (
    typeof value ===
    "bigint"
  ) {
    return value >= BigInt(0)
      ? value
      : null;
  }

  if (
    typeof value ===
    "number"
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
    typeof value ===
      "string" &&
    /^[0-9]+$/.test(
      value.trim(),
    )
  ) {
    try {
      return BigInt(
        value.trim(),
      );
    } catch {
      return null;
    }
  }

  return null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
