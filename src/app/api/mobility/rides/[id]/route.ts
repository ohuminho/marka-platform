import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
} from "@/app/api/mobility/_lib/auth";

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
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      {
        message: "Ride id is required.",
        code: "RIDE_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    const ride =
      await mobilityRideService.getById(id);

    if (!ride) {
      return NextResponse.json(
        {
          message: "Mobility ride not found.",
          code: "RIDE_NOT_FOUND",
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
            "Mobility ride does not belong to the specified organization.",
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
      ride.driver?.user?.id ===
      authentication.session.userId;

    if (!isRider && !isDriver) {
      return NextResponse.json(
        {
          message:
            "You do not have access to this Mobility ride.",
          code: "RIDE_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ride,
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
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      {
        message: "Ride id is required.",
        code: "RIDE_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const action =
      typeof body?.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    if (!action) {
      return NextResponse.json(
        {
          message:
            "Mobility ride action is required.",
          code:
            "RIDE_ACTION_REQUIRED",
        },
        { status: 400 }
      );
    }

    const ride =
      await mobilityRideService.getById(id);

    if (!ride) {
      return NextResponse.json(
        {
          message: "Mobility ride not found.",
          code: "RIDE_NOT_FOUND",
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
      ride.driver?.user?.id ===
      authentication.session.userId;

    if (
      action === "START_SEARCH" ||
      action === "CANCEL"
    ) {
      if (!isRider) {
        return NextResponse.json(
          {
            message:
              "Only the rider can perform this action.",
            code:
              "RIDER_ACTION_REQUIRED",
          },
          { status: 403 }
        );
      }
    } else {
      if (!isDriver) {
        return NextResponse.json(
          {
            message:
              "Only the assigned driver can perform this action.",
            code:
              "DRIVER_ACTION_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    let updatedRide;

    switch (action) {
      case "START_SEARCH":
        updatedRide =
          await mobilityRideService.startSearch(id);
        break;

      case "CANCEL": {
        const reason =
          typeof body?.reason === "string"
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
            { status: 400 }
          );
        }

        updatedRide =
          await mobilityRideService.cancel(
            id,
            reason
          );

        break;
      }

      case "DRIVER_ARRIVING":
        updatedRide =
          await mobilityRideService.markDriverArriving(
            id
          );
        break;

      case "DRIVER_ARRIVED":
        updatedRide =
          await mobilityRideService.markDriverArrived(
            id
          );
        break;

      case "START_TRIP":
        updatedRide =
          await mobilityRideService.startTrip(
            id
          );
        break;

      case "BEGIN_TRIP_PROGRESS":
        updatedRide =
          await mobilityRideService.beginTripProgress(
            id
          );
        break;

      case "COMPLETE":
        updatedRide =
          await mobilityRideService.complete(id);
        break;

      default:
        return NextResponse.json(
          {
            message:
              `Unsupported Mobility ride action: ${action}.`,
            code:
              "UNSUPPORTED_RIDE_ACTION",
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ride: updatedRide,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_RIDE_ACTION_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute Mobility ride action.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_RIDE_ACTION_FAILED",
      },
      { status: 409 }
    );
  }
}
