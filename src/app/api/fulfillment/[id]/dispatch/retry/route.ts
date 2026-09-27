import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { fulfillmentAdapter } from "@/fulfillment-engine/fulfillment.adapter";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
      );
    }

    const sessionService = new SessionService();
    const session = await sessionService.validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      await sessionService.revoke(token);

      return NextResponse.json(
        {
          message: "User account was not found.",
          code: "USER_NOT_FOUND",
        },
        { status: 401 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          message: "User account is not active.",
          code: "USER_NOT_ACTIVE",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const fulfillmentId = id.trim();

    if (!fulfillmentId) {
      return NextResponse.json(
        {
          message: "Fulfillment id is required.",
          code: "FULFILLMENT_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const fulfillment =
      await prisma.fulfillmentRequest.findUnique({
        where: {
          id: fulfillmentId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

    if (!fulfillment) {
      return NextResponse.json(
        {
          message: "Fulfillment not found.",
          code: "FULFILLMENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const authorization = new AuthorizationService();
    const allowed = await authorization.hasPermission(
      user.id,
      Permissions.ORDER_MANAGE,
      fulfillment.organizationId,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          message: "You do not have permission to recover this fulfillment.",
          code: "FULFILLMENT_RECOVERY_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const result =
      await fulfillmentAdapter.retryDeliveryDispatch(
        fulfillmentId,
      );

    return NextResponse.json({
      fulfillment: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";

    if (message === "Fulfillment not found.") {
      return NextResponse.json(
        {
          message,
          code: "FULFILLMENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    console.error("[FULFILLMENT_DISPATCH_RETRY_ERROR]", error);

    return NextResponse.json(
      {
        message: "Unable to retry delivery dispatch.",
        code: "FULFILLMENT_DISPATCH_RETRY_FAILED",
      },
      { status: 500 },
    );
  }
}
