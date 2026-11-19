import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import { mobilityLifecycleService } from "@/services/mobility/orchestration/mobility-lifecycle.service";
import { mobilityRoutingService } from "@/services/mobility/pricing/mobility-routing.service";
import { quoteMobilityFare } from "@/services/mobility/pricing/mobility-tariff.service";

import type { MobilitySafetyMode } from "@/services/mobility/orchestration/mobility-lifecycle.types";

import {
  MobilityRideService,
} from "@/services/mobility/rides/mobility-ride.service";

const mobilityRideService =
  new MobilityRideService();

const MOBILITY_SERVICE_TYPES = new Set([
  "TAXI", "EXECUTIVE", "MOTO_TAXI", "VAN", "MINIBUS", "BUS", "COACH",
  "PICKUP", "LIGHT_TRUCK", "MEDIUM_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK",
]);

export async function POST(
  request: Request,
) {
  const authentication =
    await authenticateMobilityRequest(
      request,
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
        body,
      );

    const requestContext =
      getRequestContext(
        request,
      );

    if (currency !== "AOA") {
      return NextResponse.json({ message: "MARKA Mobility currently supports AOA fares only.", code: "MOBILITY_CURRENCY_UNSUPPORTED" }, { status: 400 });
    }

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
        },
      );
    }

    if (!MOBILITY_SERVICE_TYPES.has(serviceType)) {
      return NextResponse.json(
        {
          message: "O tipo de serviço Mobility não é válido.",
          code: "MOBILITY_SERVICE_TYPE_INVALID",
        },
        { status: 400 },
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
        },
      );
    }

    const passengerCountWasProvided = body?.passengerCount !== undefined;
    const passengerCount =
      !passengerCountWasProvided
        ? 1
        : Number.isInteger(body.passengerCount)
          ? Number(body.passengerCount)
          : Number.NaN;

    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 100) {
      return NextResponse.json(
        {
          message: "O número de passageiros deve estar entre 1 e 100.",
          code: "INVALID_PASSENGER_COUNT",
        },
        { status: 400 },
      );
    }

    if (serviceType === "MOTO_TAXI" && passengerCount !== 1) {
      return NextResponse.json(
        {
          message: "O serviço de moto-táxi aceita apenas um passageiro.",
          code: "MOTO_TAXI_PASSENGER_LIMIT",
        },
        { status: 400 },
      );
    }

    if (["TAXI", "EXECUTIVE"].includes(serviceType) && passengerCount > 4) {
      return NextResponse.json(
        {
          message: "Esta categoria de viatura aceita no máximo quatro passageiros.",
          code: "PASSENGER_VEHICLE_CAPACITY_EXCEEDED",
        },
        { status: 400 },
      );
    }

    const safetyMode =
      normalizeSafetyMode(
        body?.safetyMode,
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
        },
      );
    }

    const routeEstimate = await mobilityRoutingService.estimate(
      { latitude: Number(body?.pickupLatitude), longitude: Number(body?.pickupLongitude) },
      { latitude: Number(body?.dropoffLatitude), longitude: Number(body?.dropoffLongitude) },
    );
    const fare = quoteMobilityFare(serviceType, routeEstimate.distanceMeters, routeEstimate.durationSeconds);
    if (!fare) {
      return NextResponse.json({ message: "A tabela tarifária desta categoria ainda não está configurada.", code: "MOBILITY_TARIFF_NOT_CONFIGURED" }, { status: 409 });
    }

    const { ride } =
      await mobilityRideService.createIdempotent({
        organizationId:
          authentication.session
            .organizationId,

        riderId:
          authentication.session
            .userId,

        serviceType,

        currency,
        estimatedFareMinor: BigInt(fare.totalMinor),

        pickupLatitude:
          Number(
            body?.pickupLatitude,
          ),

        pickupLongitude:
          Number(
            body?.pickupLongitude,
          ),

        pickupAddress:
          typeof body?.pickupAddress ===
          "string"
            ? body.pickupAddress.trim()
            : undefined,

        dropoffLatitude:
          Number(
            body?.dropoffLatitude,
          ),

        dropoffLongitude:
          Number(
            body?.dropoffLongitude,
          ),

        dropoffAddress:
          typeof body?.dropoffAddress ===
          "string"
            ? body.dropoffAddress.trim()
            : undefined,

        stops:
          Array.isArray(
            body?.stops,
          )
            ? body.stops
            : undefined,

        metadata: {
          ...(
            body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
              ? Object.fromEntries(Object.entries(body.metadata as Record<string, unknown>).filter(
                  ([key]) => !["quotedFareMinor", "estimatedFareMinor", "estimatedDistanceMeters", "estimatedDurationSeconds", "pricingSnapshot"].includes(key),
                ))
              : {}
          ),
          // Immutable server-generated quote details are kept with the ride so
          // payment initialization never trusts a fare supplied by the client.
          pricingSnapshot: {
            source: "MARKA_SERVER_TARIFF",
            version: 1,
            currency: fare.currency,
            serviceType,
            distanceMeters: fare.distanceMeters,
            durationSeconds: fare.durationSeconds,
            totalMinor: fare.totalMinor,
          },
          safetyMode,
          passengerCount,
        },
      }, idempotencyKey);

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

    // A ride request must enter the real safety + matching + dispatch
    // pipeline immediately; merely creating an orchestration leaves it stuck
    // at REQUESTED and no driver can ever receive the offer.
    const orchestration =
      await mobilityLifecycleService.execute({
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
          `${idempotencyKey}:dispatch`,

        ipAddress:
          requestContext.ipAddress,

        userAgent:
          requestContext.userAgent,

        safetyMode,

        action: "DISPATCH",
      });

    const refreshedRide =
      await mobilityRideService.getById(
        ride.id,
      );

    return NextResponse.json(
      {
        ride: refreshedRide ?? ride,
        orchestration,
      },
      {
        status:
          orchestration.recoveryRequired
            ? 202
            : 201,
      },
    );
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_CREATE_API_ERROR]",
      error,
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
      },
    );
  }
}

export async function GET(
  request: Request,
) {
  const authentication =
    await authenticateMobilityRequest(
      request,
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const ride =
      await mobilityRideService.getActiveRideForRider(
        authentication.session.userId,
        authentication.session.organizationId,
      );

    const orchestration =
      ride
        ? await mobilityLifecycleService.get(
            authentication.session
              .organizationId,
            ride.id,
          )
        : null;

    return NextResponse.json({
      ride,
      orchestration,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_ACTIVE_RIDE_API_ERROR]",
      error,
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
      },
    );
  }
}

function normalizeSafetyMode(
  value: unknown,
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
