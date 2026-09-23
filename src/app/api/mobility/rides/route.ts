import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
} from "@/app/api/mobility/_lib/auth";

import {
  MobilityRideService,
} from "@/services/mobility/rides/mobility-ride.service";

const mobilityRideService =
  new MobilityRideService();

export async function POST(
  request: Request
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const body = await request.json();

    const serviceType =
      typeof body?.serviceType === "string"
        ? body.serviceType.trim()
        : "";

    const currency =
      typeof body?.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "AOA";

    if (!serviceType) {
      return NextResponse.json(
        {
          message:
            "Mobility service type is required.",
          code:
            "MOBILITY_SERVICE_TYPE_REQUIRED",
        },
        { status: 400 }
      );
    }

    const ride =
      await mobilityRideService.create({
        organizationId:
          authentication.session.organizationId,

        riderId:
          authentication.session.userId,

        serviceType,

        currency,

        pickupLatitude:
          Number(body?.pickupLatitude),

        pickupLongitude:
          Number(body?.pickupLongitude),

        pickupAddress:
          typeof body?.pickupAddress === "string"
            ? body.pickupAddress.trim()
            : undefined,

        dropoffLatitude:
          Number(body?.dropoffLatitude),

        dropoffLongitude:
          Number(body?.dropoffLongitude),

        dropoffAddress:
          typeof body?.dropoffAddress === "string"
            ? body.dropoffAddress.trim()
            : undefined,

        stops:
          Array.isArray(body?.stops)
            ? body.stops
            : undefined,

        metadata:
          body?.metadata &&
          typeof body.metadata === "object"
            ? body.metadata
            : undefined,
      });

    return NextResponse.json(
      {
        ride,
      },
      { status: 201 }
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
        code: "MOBILITY_RIDE_CREATION_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function GET(
  request: Request
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const ride =
      await mobilityRideService.getActiveRideForRider(
        authentication.session.userId
      );

    if (
      ride &&
      ride.organizationId !==
        authentication.session.organizationId
    ) {
      return NextResponse.json(
        {
          ride: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ride,
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
      { status: 500 }
    );
  }
}
