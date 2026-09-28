import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { deliveryAgentService } from "@/services/delivery/agents/delivery-agent.service";

const schema = z.object({
  availability: z.enum(["OFFLINE", "AVAILABLE", "BUSY", "SUSPENDED"]),
});

function getToken(request: Request): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

export async function PATCH(request: Request) {
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

    const session = await new SessionService().validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 },
      );
    }

    const agent = await prisma.deliveryAgent.findFirst({
      where: {
        userId: session.userId,
      },
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

    const authorization = new AuthorizationService();

    if (
      !(await authorization.hasPermission(
        session.userId,
        Permissions.DELIVERY_AGENT_OPERATE,
        agent.organizationId,
      ))
    ) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to operate as a delivery agent.",
          code: "DELIVERY_AGENT_OPERATION_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid availability.",
          code: "INVALID_DELIVERY_AGENT_AVAILABILITY",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await deliveryAgentService.setAvailability(
      agent.id,
      parsed.data.availability,
    );

    return NextResponse.json({
      agent: updated,
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_AVAILABILITY_UPDATE_FAILED";

    return NextResponse.json(
      {
        message: "Unable to update delivery agent availability.",
        code,
      },
      {
        status:
          code === "DELIVERY_AGENT_NOT_ACTIVE"
            ? 409
            : 500,
      },
    );
  }
}
