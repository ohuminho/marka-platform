import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilitySafetyService,
} from "@/services/mobility/safety/mobility-safety.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

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
        message: "Driver id is required.",
        code: "DRIVER_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  try {
    const safety =
      await mobilitySafetyService.evaluateDriverSafety({
        organizationId:
          authentication.session.organizationId,

        driverId: id,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json({
      safety,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_DRIVER_SAFETY_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to evaluate driver safety.";

    return NextResponse.json(
      {
        message,
        code: "MOBILITY_DRIVER_SAFETY_EVALUATION_FAILED",
      },
      { status: 409 }
    );
  }
}
