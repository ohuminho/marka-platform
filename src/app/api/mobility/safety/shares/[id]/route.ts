import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilitySafetyService,
} from "@/services/mobility/safety/mobility-safety.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  const { id } =
    await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      {
        message:
          "Trip share id is required.",
        code:
          "TRIP_SHARE_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    await mobilitySafetyService.revokeTripShare(
      id,
      authentication.session.userId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_TRIP_SHARE_REVOKE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to revoke trip share.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_TRIP_SHARE_REVOCATION_FAILED",
      },
      { status: 409 }
    );
  }
}
