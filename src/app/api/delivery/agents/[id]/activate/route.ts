import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { deliveryAgentService } from "@/services/delivery/agents/delivery-agent.service";

function getSessionToken(
  request: Request,
): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ??
    null
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const token = getSessionToken(request);

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

    if (!id) {
      return NextResponse.json(
        {
          message: "Delivery agent ID is required.",
          code: "DELIVERY_AGENT_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const agent =
      await prisma.deliveryAgent.findUnique({
        where: { id },
        select: {
          id: true,
          organizationId: true,
        },
      });

    if (!agent) {
      return NextResponse.json(
        {
          message: "Delivery agent not found.",
          code: "DELIVERY_AGENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const authorization =
      new AuthorizationService();

    if (
      !(await authorization.hasPermission(
        session.userId,
        Permissions.DELIVERY_AGENT_MANAGE,
        agent.organizationId,
      ))
    ) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to manage delivery agents.",
          code: "DELIVERY_AGENT_MANAGE_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const updated =
      await deliveryAgentService.activate(
        agent.id,
      );

    return NextResponse.json({
      agent: updated,
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_ACTIVATION_FAILED";

    const status =
      code === "DELIVERY_AGENT_NOT_FOUND"
        ? 404
        : 500;

    return NextResponse.json(
      {
        message:
          "Unable to activate delivery agent.",
        code,
      },
      { status },
    );
  }
}
