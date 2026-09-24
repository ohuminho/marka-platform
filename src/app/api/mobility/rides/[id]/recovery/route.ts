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

  const {
    id: rideId,
  } =
    await context.params;

  if (!rideId.trim()) {
    return NextResponse.json(
      {
        message:
          "Mobility ride id is required.",
      },
      {
        status: 400,
      },
    );
  }

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
      {
        status: 404,
      },
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
      {
        status: 403,
      },
    );
  }

  try {
    const requestContext =
      getRequestContext(
        request,
      );

    const reconciliation =
      await mobilityFinancialRecoveryService
        .reconcile({
          organizationId:
            authentication.session
              .organizationId,

          rideId,

          actorUserId:
            authentication.session
              .userId,

          correlationId:
            requestContext.correlationId,

          requestId:
            requestContext.requestId,

          ipAddress:
            requestContext.ipAddress,

          userAgent:
            requestContext.userAgent,
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
      {
        status: 500,
      },
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

  const {
    id: rideId,
  } =
    await context.params;

  if (!rideId.trim()) {
    return NextResponse.json(
      {
        message:
          "Mobility ride id is required.",
      },
      {
        status: 400,
      },
    );
  }

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
      {
        status: 404,
      },
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
      {
        status: 403,
      },
    );
  }

  let body:
    Record<string, unknown> = {};

  try {
    const parsed =
      await request.json();

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
    ) {
      body =
        parsed as Record<
          string,
          unknown
        >;
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
      {
        status: 400,
      },
    );
  }

  const requestContext =
    getRequestContext(
      request,
    );

  const finalFareMinor =
    body.finalFareMinor ===
    undefined
      ? undefined
      : parseBigInt(
          body.finalFareMinor,
        );

  if (
    body.finalFareMinor !==
      undefined &&
    finalFareMinor ===
      null
  ) {
    return NextResponse.json(
      {
        message:
          "finalFareMinor must be a valid non-negative integer.",
      },
      {
        status: 400,
      },
    );
  }

  const availableDigitalProceedsMinor =
    body.availableDigitalProceedsMinor ===
    undefined
      ? undefined
      : parseBigInt(
          body.availableDigitalProceedsMinor,
        );

  if (
    body.availableDigitalProceedsMinor !==
      undefined &&
    availableDigitalProceedsMinor ===
      null
  ) {
    return NextResponse.json(
      {
        message:
          "availableDigitalProceedsMinor must be a valid non-negative integer.",
      },
      {
        status: 400,
      },
    );
  }

  const sourceReference =
    typeof body.sourceReference ===
    "string"
      ? body.sourceReference.trim()
      : undefined;

  try {
    const result =
      await mobilityFinancialRecoveryService
        .recover({
          organizationId:
            authentication.session
              .organizationId,

          rideId,

          actorUserId:
            authentication.session
              .userId,

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

          sourceReference,

          paymentIdempotencyKey:
            `${idempotencyKey}:payment`,

          settlementIdempotencyKey:
            `${idempotencyKey}:settlement`,

          settlementCompletionIdempotencyKey:
            `${idempotencyKey}:settlement-complete`,

          metadata:
            isRecord(
              body.metadata,
            )
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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to recover Mobility financials.";

    const status =
      message.includes(
        "accounting mismatch",
      ) ||
      message.includes(
        "does not reconcile",
      )
        ? 409
        : message.includes(
            "requires",
          ) ||
          message.includes(
            "must",
          )
          ? 400
          : 500;

    return NextResponse.json(
      {
        message,
      },
      {
        status,
      },
    );
  }
}

function parseBigInt(
  value: unknown,
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
    if (
      !Number.isSafeInteger(
        value,
      ) ||
      value < 0
    ) {
      return null;
    }

    return BigInt(
      value,
    );
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
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
