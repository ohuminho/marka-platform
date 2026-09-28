import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { dispatchAdapter } from "@/dispatch-engine/dispatch.adapter";

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(3)
    .max(500),
});

function getToken(request: Request): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
      );
    }

    const session =
      await new SessionService().validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const dispatchId = id.trim();

    if (!dispatchId) {
      return NextResponse.json(
        {
          message: "Dispatch request is required.",
          code: "DISPATCH_REQUEST_REQUIRED",
        },
        { status: 400 },
      );
    }

    const parsed =
      schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid reassignment request.",
          code: "INVALID_REASSIGNMENT_REQUEST",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const dispatch =
      await prisma.dispatchRequest.findUnique({
        where: {
          id: dispatchId,
        },
        select: {
          id: true,
          organizationId: true,
          serviceType: true,
          subjectType: true,
          subjectId: true,
          status: true,
        },
      });

    if (!dispatch) {
      return NextResponse.json(
        {
          message: "Dispatch request not found.",
          code: "DISPATCH_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const authorization =
      new AuthorizationService();

    const allowed =
      await authorization.hasPermission(
        session.userId,
        Permissions.ORDER_MANAGE,
        dispatch.organizationId,
      );

    if (!allowed) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to reassign this delivery.",
          code: "DELIVERY_REASSIGN_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    if (
      dispatch.serviceType !== "DELIVERY" ||
      dispatch.subjectType !== "FULFILLMENT"
    ) {
      return NextResponse.json(
        {
          message:
            "Only fulfillment delivery dispatches can be reassigned.",
          code: "INVALID_DELIVERY_DISPATCH",
        },
        { status: 409 },
      );
    }

    const result =
      await dispatchAdapter.reassign(
        dispatchId,
        parsed.data.reason,
      );

    return NextResponse.json({
      dispatch: result,
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_REASSIGN_FAILED";

    const status =
      code.includes("cannot be reassigned")
        ? 409
        : code.includes("not found")
          ? 404
          : 500;

    return NextResponse.json(
      {
        message:
          "Unable to reassign delivery.",
        code,
      },
      { status },
    );
  }
}
