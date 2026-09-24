import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilityFinancialOrchestratorService,
} from "@/services/mobility/finance/mobility-financial-orchestrator.service";

import {
  commissionPolicyService,
} from "@/services/finance/commission/commission-policy.service";

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

  if (!rideId?.trim()) {
    return NextResponse.json(
      {
        message:
          "Ride id is required.",
        code:
          "RIDE_ID_REQUIRED",
      },
      { status: 400 },
    );
  }

  let body:
    Record<string, unknown>;

  try {
    const parsed =
      await request.json();

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return NextResponse.json(
        {
          message:
            "Request body must be an object.",
          code:
            "INVALID_REQUEST_BODY",
        },
        { status: 400 },
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
      { status: 400 },
    );
  }

  const operation =
    typeof body.operation === "string"
      ? body.operation
          .trim()
          .toUpperCase()
      : "";

  if (
    operation !== "INITIALIZE" &&
    operation !== "FINALIZE"
  ) {
    return NextResponse.json(
      {
        message:
          "Financial operation must be INITIALIZE or FINALIZE.",
        code:
          "INVALID_FINANCIAL_OPERATION",
      },
      { status: 400 },
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
        code:
          "RIDE_NOT_FOUND",
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
        code:
          "RIDE_ORGANIZATION_ACCESS_DENIED",
      },
      { status: 403 },
    );
  }

  const requestContext =
    getRequestContext(request);

  if (
    operation ===
    "INITIALIZE"
  ) {
    if (
      ride.riderId !==
      authentication.session.userId
    ) {
      return NextResponse.json(
        {
          message:
            "Only the rider can initialize ride financials.",
          code:
            "RIDER_FINANCIAL_ACCESS_REQUIRED",
        },
        { status: 403 },
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
        { status: 400 },
      );
    }

    const estimatedFareMinor =
      parseBigInt(
        body.estimatedFareMinor,
      );

    if (
      estimatedFareMinor ===
      null
    ) {
      return NextResponse.json(
        {
          message:
            "estimatedFareMinor must be a valid non-negative integer.",
          code:
            "INVALID_ESTIMATED_FARE",
        },
        { status: 400 },
      );
    }

    const finalFareMinor =
      body.finalFareMinor !==
      undefined
        ? parseBigInt(
            body.finalFareMinor,
          )
        : undefined;

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
          code:
            "INVALID_FINAL_FARE",
        },
        { status: 400 },
      );
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
          code:
            "IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 },
      );
    }

    const policy =
      getMobilityCommissionPolicy(
        ride.serviceType,
      );

    const result =
      await mobilityFinancialOrchestratorService
        .initializeRideFinancials({
          organizationId:
            authentication.session
              .organizationId,

          rideId,

          riderId:
            authentication.session
              .userId,

          driverId:
            ride.driverId ??
            undefined,

          paymentMethod:
            paymentMethod as
              | "CASH"
              | "DIGITAL",

          currency:
            ride.currency,

          estimatedFareMinor,

          finalFareMinor:
            finalFareMinor ??
            undefined,

          commissionRateBps:
            policy.rateBps,

          commissionPolicyKey:
            policy.key,

          commissionPolicyVersion:
            policy.version,

          pricingSnapshot:
            isRecord(
              body.pricingSnapshot,
            )
              ? body.pricingSnapshot
              : undefined,

          metadata:
            isRecord(
              body.metadata,
            )
              ? body.metadata
              : undefined,

          idempotencyKey,

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
        });

    return NextResponse.json(
      result,
      { status: 201 },
    );
  }

  if (
    !ride.driver ||
    ride.driver.user?.id !==
      authentication.session.userId
  ) {
    return NextResponse.json(
      {
        message:
          "Only the assigned driver can finalize ride financials.",
        code:
          "DRIVER_FINANCIAL_ACCESS_REQUIRED",
      },
      { status: 403 },
    );
  }

  const finalFareMinor =
    parseBigInt(
      body.finalFareMinor,
    );

  if (
    finalFareMinor ===
    null
  ) {
    return NextResponse.json(
      {
        message:
          "finalFareMinor must be a valid non-negative integer.",
        code:
          "INVALID_FINAL_FARE",
      },
      { status: 400 },
    );
  }

  const paymentIdempotencyKey =
    typeof body.paymentIdempotencyKey ===
    "string"
      ? body.paymentIdempotencyKey.trim()
      : "";

  const settlementIdempotencyKey =
    typeof body.settlementIdempotencyKey ===
    "string"
      ? body.settlementIdempotencyKey.trim()
      : "";

  const settlementCompletionIdempotencyKey =
    typeof body
      .settlementCompletionIdempotencyKey ===
    "string"
      ? body
          .settlementCompletionIdempotencyKey
          .trim()
      : "";

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
      { status: 400 },
    );
  }

  const availableDigitalProceedsMinor =
    body.availableDigitalProceedsMinor !==
    undefined
      ? parseBigInt(
          body.availableDigitalProceedsMinor,
        )
      : undefined;

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
        code:
          "INVALID_DIGITAL_PROCEEDS",
      },
      { status: 400 },
    );
  }

  const sourceReference =
    typeof body.sourceReference ===
    "string"
      ? body.sourceReference.trim()
      : undefined;

  const result =
    await mobilityFinancialOrchestratorService
      .finalizeRideFinancials({
        organizationId:
          authentication.session
            .organizationId,

        rideId,

        finalFareMinor,

        availableDigitalProceedsMinor:
          availableDigitalProceedsMinor ??
          undefined,

        sourceReference,

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

        paymentIdempotencyKey,

        settlementIdempotencyKey,

        settlementCompletionIdempotencyKey,

        metadata:
          isRecord(
            body.metadata,
          )
            ? body.metadata
            : undefined,
      });

  return NextResponse.json(
    result,
    { status: 200 },
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
      "string"
  ) {
    const normalized =
      value.trim();

    if (
      !/^[0-9]+$/.test(
        normalized,
      )
    ) {
      return null;
    }

    try {
      return BigInt(
        normalized,
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
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getMobilityCommissionPolicy(
  serviceType: string,
) {
  const normalized =
    serviceType
      .trim()
      .toUpperCase();

  if (
    normalized ===
      "MOTO_TAXI" ||
    normalized ===
      "MOTO-TAXI" ||
    normalized ===
      "MOTOTAXI"
  ) {
    return commissionPolicyService
      .getMotoTaxiPolicy();
  }

  return commissionPolicyService
    .getTaxiPolicy();
}
