import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { deliveryAgentService } from "@/services/delivery/agents/delivery-agent.service";

function getSessionToken(request: Request): string | null {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const session = await new SessionService().validate(token);
    if (!session) return NextResponse.json({ message: "Invalid or expired session.", code: "INVALID_SESSION" }, { status: 401 });

    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };
    const status = body.status;
    if (!id || !["PENDING", "ACTIVE", "SUSPENDED", "BLOCKED", "INACTIVE"].includes(status ?? "")) {
      return NextResponse.json({ message: "A valid delivery agent ID and status are required.", code: "INVALID_DELIVERY_AGENT_STATUS" }, { status: 400 });
    }

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    if (!agent) return NextResponse.json({ message: "Delivery agent not found.", code: "DELIVERY_AGENT_NOT_FOUND" }, { status: 404 });

    const authorization = new AuthorizationService();
    if (!(await authorization.hasPermission(session.userId, Permissions.DELIVERY_AGENT_MANAGE, agent.organizationId))) {
      return NextResponse.json({ message: "You do not have permission to manage delivery agents.", code: "DELIVERY_AGENT_MANAGE_FORBIDDEN" }, { status: 403 });
    }

    const updated = await deliveryAgentService.updateStatus(
      agent.id,
      status as "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "INACTIVE",
    );

    return NextResponse.json({ agent: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DELIVERY_AGENT_STATUS_UPDATE_FAILED";
    const status =
      code === "DELIVERY_AGENT_NOT_FOUND"
        ? 404
        : code === "DELIVERY_AGENT_HAS_ACTIVE_DELIVERY"
          ? 409
          : 500;

    return NextResponse.json(
      {
        message:
          code === "DELIVERY_AGENT_HAS_ACTIVE_DELIVERY"
            ? "Delivery agent has an active delivery and cannot be deactivated."
            : "Unable to update delivery agent status.",
        code,
      },
      { status },
    );
  }
}
