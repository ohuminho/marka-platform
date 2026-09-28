import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { deliveryAgentOfferService } from "@/services/delivery/agents/delivery-agent-offer.service";

function getToken(request: Request): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);

    const parsedLimit = Number(
      url.searchParams.get("limit") ?? 20,
    );

    const parsedOffset = Number(
      url.searchParams.get("offset") ?? 0,
    );

    const result =
      await deliveryAgentOfferService.list({
        agentId: agent.id,
        organizationId: agent.organizationId,
        limit: Number.isInteger(parsedLimit)
          ? parsedLimit
          : 20,
        offset: Number.isInteger(parsedOffset)
          ? parsedOffset
          : 0,
      });

    return NextResponse.json({
      offers: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_OFFERS_FAILED";

    return NextResponse.json(
      {
        message: "Unable to load delivery offers.",
        code,
      },
      { status: 500 },
    );
  }
}
