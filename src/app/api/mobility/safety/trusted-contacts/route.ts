import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
  getRequestContext,
} from "@/app/api/mobility/_lib/auth";

import {
  prisma,
} from "@/database/client/prisma";

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

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const phone =
      typeof body?.phone === "string"
        ? body.phone.trim()
        : "";

    const relationship =
      typeof body?.relationship === "string"
        ? body.relationship.trim()
        : undefined;

    if (!name) {
      return NextResponse.json(
        {
          message:
            "Trusted contact name is required.",
          code:
            "TRUSTED_CONTACT_NAME_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          message:
            "Trusted contact phone is required.",
          code:
            "TRUSTED_CONTACT_PHONE_REQUIRED",
        },
        { status: 400 }
      );
    }

    const contact =
      await mobilitySafetyService.createTrustedContact({
        userId:
          authentication.session.userId,

        name,
        phone,
        relationship,

        actorUserId:
          authentication.session.userId,

        ...getRequestContext(request),
      });

    return NextResponse.json(
      {
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MOBILITY_TRUSTED_CONTACT_CREATE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create trusted contact.";

    return NextResponse.json(
      {
        message,
        code:
          "MOBILITY_TRUSTED_CONTACT_CREATION_FAILED",
      },
      { status: 409 }
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
    const contacts =
      await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          phone: string;
          relationship: string | null;
          status: string;
          verifiedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT
          "id",
          "name",
          "phone",
          "relationship",
          "status",
          "verifiedAt",
          "createdAt",
          "updatedAt"
        FROM "MobilityTrustedContact"
        WHERE "userId" =
          ${authentication.session.userId}
        ORDER BY "createdAt" DESC
      `;

    return NextResponse.json({
      contacts,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_TRUSTED_CONTACT_LIST_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to retrieve trusted contacts.",
        code:
          "MOBILITY_TRUSTED_CONTACT_RETRIEVAL_FAILED",
      },
      { status: 500 }
    );
  }
          }
