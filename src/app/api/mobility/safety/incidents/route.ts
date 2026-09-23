import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  mobilitySafetyService,
} from "@/services/mobility/safety/mobility-safety.service";

export async function POST(
  request: Request
) {
  const authentication =
    await authenticateMobilityRequest(request);

  if (!authentication.ok) {
    return authentication.response;
  }

  try {
    const body =
      await request.json();

    const type =
      typeof body?.type === "string"
        ? body.type.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    const severity =
      typeof body?.severity === "string"
        ? body.severity.trim().toUpperCase()
        : "MEDIUM";

    const validSeverities = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ];

    if (!type) {
      return NextResponse.json(
        {
          message:
            "Safety incident type is required.",
          code:
            "SAFETY_INCIDENT_TYPE_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          message:
            "Safety incident description is required.",
          code:
            "SAFETY_INCIDENT_DESCRIPTION_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (
      !validSeverities.includes(
        severity
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid safety incident severity.",
          code:
            "INVALID_SAFETY_INCIDENT_SEVERITY",
        },
        { status: 400 }
      );
    }

    const incident =
      await mobilitySafetyService.reportSafetyIncident({
        organizationId:
          authentication.session.organizationId,

        rideId:
          typeof body?.rideId === "string"
            ? body.rideId.trim()
            : undefined,

        driverId:
          typeof body?.driverId === "string"
            ? body.driverId.trim()
            : undefined,

        riderId:
          typeof body?.riderId === "string"
            ? body.riderId.trim()
            : undefined,

        reportedByUserId:
          authentication.session.userId,

        type,

        severity:
          severity as
            | "LOW"
            | "MEDIUM"
            | "HIGH"
            | "CRITICAL",

        description,

        metadata:
          body?.metadata &&
          typeof body.metadata === "object" &&
          !Array.isArray(body.metadata)
            ? body.metadata
            : undefined,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json(
      {
        incident,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_SAFETY_INCIDENT_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to report safety incident.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_SAFETY_INCIDENT_CREATION_FAILED",
      },
      { status: 409 }
    );
  }
}
