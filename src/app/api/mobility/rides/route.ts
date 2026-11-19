import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import { mobilityLifecycleService } from "@/services/mobility/orchestration/mobility-lifecycle.service";
import { mobilityRoutingService } from "@/services/mobility/pricing/mobility-routing.service";
import { quoteMobilityFare } from "@/services/mobility/pricing/mobility-tariff.service";
import { mobilityPromotionService } from "@/services/mobility/pricing/mobility-promotion.service";

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
    const promotion = await mobilityPromotionService.quote(serviceType, fare);

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

    let finalFareMinor = fare.totalMinor;
    let promotionApplied = false;
    let promotionDiscountMinor = "0";
    let orchestration;

    try {
      try {
        const promotionResult = await mobilityPromotionService.reserveForRide({
          rideId: ride.id,
          idempotencyKey: idempotencyKey + ":promotion",
          promotion,
          originalFareMinor: fare.totalMinor,
          currency,
        });
        finalFareMinor = promotionResult.finalFareMinor;
        promotionApplied = promotionResult.applied;
        promotionDiscountMinor = promotionResult.applied ? promotion?.discountMinor ?? "0" : "0";
      } catch (promotionError) {
        // Promotions are optional. A promotion subsystem outage must never
        // prevent a passenger's already-priced ride from reaching dispatch.
        console.error("[MOBILITY_RIDE_PROMOTION_RESERVATION_FAILED]", {
          rideId: ride.id,
          error: promotionError,
        });
      }

      await mobilityLifecycleService.initialize({
        organizationId: authentication.session.organizationId,
        rideId: ride.id,
        actorUserId: authentication.session.userId,
        correlationId: requestContext.correlationId,
        requestId: requestContext.requestId,
        idempotencyKey: idempotencyKey + ":orchestration",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        safetyMode,
      });

      // Start real matching immediately. A transient dispatch failure must
      // never turn an already-persisted ride into a client-visible create error.
      orchestration = await mobilityLifecycleService.execute({
        organizationId: authentication.session.organizationId,
        rideId: ride.id,
        actorUserId: authentication.session.userId,
        correlationId: requestContext.correlationId,
        requestId: requestContext.requestId,
        idempotencyKey: idempotencyKey + ":dispatch",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        safetyMode,
        action: "DISPATCH",
      });

      // If dispatch reached SEARCHING but hit a retryable dependency failure,
      // make one bounded recovery attempt in this request. The lifecycle's
      // lease and idempotency checks prevent duplicate concurrent assignment.
      if (
        orchestration.recoveryRequired &&
        orchestration.currentStep === "RECOVERY_REQUIRED" &&
        orchestration.ride?.status === "SEARCHING"
      ) {
        orchestration = await mobilityLifecycleService.execute({
          organizationId: authentication.session.organizationId,
          rideId: ride.id,
          actorUserId: authentication.session.userId,
          correlationId: requestContext.correlationId,
          requestId: requestContext.requestId,
          idempotencyKey: idempotencyKey + ":dispatch-recovery-attempt",
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          safetyMode,
          action: "RETRY_DISPATCH",
        });
      }
    } catch (postCreateError) {
      console.error("[MOBILITY_RIDE_POST_CREATE_RECOVERY_REQUIRED]", { rideId: ride.id, error: postCreateError });
      const [recoveredRide, recoveredOrchestration] = await Promise.all([
        mobilityRideService.getById(ride.id).catch(() => null),
        mobilityLifecycleService.get(authentication.session.organizationId, ride.id).catch(() => null),
      ]);
      return NextResponse.json({
        ride: recoveredRide ?? ride,
        orchestration: recoveredOrchestration,
        recoveryRequired: true,
        pricing: { currency, originalFareMinor: fare.totalMinor, finalFareMinor, promotionApplied, promotionDiscountMinor },
        code: "MOBILITY_RIDE_POST_CREATE_RECOVERY_REQUIRED",
        message: "A viagem foi registada. Estamos a recuperar a procura de motorista; não crie outro pedido.",
      }, { status: 202 });
    }
    const refreshedRide =
      await mobilityRideService.getById(
        ride.id,
      );

    return NextResponse.json(
      {
        ride: refreshedRide ?? ride,
        orchestration,
        pricing: {
          currency,
          originalFareMinor: fare.totalMinor,
          finalFareMinor,
          promotionApplied,
          promotionDiscountMinor,
        },
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
