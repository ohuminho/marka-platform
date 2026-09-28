import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import {
  deliveryAgentDeliveryService,
  type DeliveryAgentDeliveryScope,
} from "@/services/delivery/agents/delivery-agent-delivery.service";

function getToken(request: Request): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

function parseScope(
  value: string | null,
): DeliveryAgentDeliveryScope {
  if (value === "HISTORY" || value === "ALL") {
    return value;
  }

  return "ACTIVE";
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
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
        status: true,
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

    const scope = parseScope(
      url.searchParams.get("scope"),
    );

    const limit = Math.min(
      parsePositiveInteger(
        url.searchParams.get("limit"),
        20,
      ),
      50,
    );

    const offset = parsePositiveInteger(
      url.searchParams.get("offset"),
      0,
    );

    const result =
      await deliveryAgentDeliveryService.list({
        agentId: agent.id,
        organizationId: agent.organizationId,
        scope,
        limit,
        offset,
      });

    return NextResponse.json({
      deliveries: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        scope: result.scope,
      },
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_DELIVERIES_FAILED";

    return NextResponse.json(
      {
        message:
          "Unable to load delivery agent deliveries.",
        code,
      },
      { status: 500 },
    );
  }
}
