import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { fulfillmentAdapter } from "@/fulfillment-engine/fulfillment.adapter";
import type { FulfillmentStatus } from "@/fulfillment-engine/fulfillment.contracts";

const schema = z.object({
  status: z.enum([
    "PREPARING",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "COMPLETED",
    "EXCEPTION",
  ]),
  reason: z.string().trim().max(500).optional(),
});

function getToken(request: Request): string | null {
  return (
    request.headers.get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session.", code: "INVALID_SESSION" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid delivery transition.",
          code: "INVALID_DELIVERY_TRANSITION",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const agent = await prisma.deliveryAgent.findFirst({
      where: { userId: session.userId },
      select: { id: true, organizationId: true },
    });
    if (!agent) {
      return NextResponse.json(
        { message: "Delivery agent not found.", code: "DELIVERY_AGENT_NOT_FOUND" },
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
          message: "You do not have permission to operate as a delivery agent.",
          code: "DELIVERY_AGENT_OPERATION_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const dispatch = await prisma.dispatchRequest.findFirst({
      where: {
        id,
        organizationId: agent.organizationId,
        serviceType: "DELIVERY",
        subjectType: "FULFILLMENT",
      },
      select: {
        id: true,
        subjectId: true,
        acceptedAgentId: true,
        status: true,
      },
    });

    if (!dispatch) {
      return NextResponse.json(
        { message: "Delivery dispatch not found.", code: "DISPATCH_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (dispatch.acceptedAgentId !== agent.id) {
      return NextResponse.json(
        {
          message: "This delivery is not assigned to the authenticated agent.",
          code: "DELIVERY_NOT_ASSIGNED_TO_AGENT",
        },
        { status: 403 },
      );
    }

    if (dispatch.status !== "ACCEPTED") {
      return NextResponse.json(
        {
          message: "Delivery dispatch must be accepted before operational transition.",
          code: "DELIVERY_DISPATCH_NOT_ACCEPTED",
        },
        { status: 409 },
      );
    }

    const status = parsed.data.status as FulfillmentStatus;

    if (status === "COMPLETED") {
      const fulfillment =
        await fulfillmentAdapter.completeDeliveryDispatch(
          dispatch.id,
          dispatch.subjectId,
          agent.id,
        );

      return NextResponse.json({ fulfillment });
    }

    const fulfillment = await fulfillmentAdapter.transition(
      dispatch.subjectId,
      status,
      parsed.data.reason,
    );

    return NextResponse.json({ fulfillment });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_TRANSITION_FAILED";

    const status =
      code.includes("Invalid fulfillment transition") ||
      code.includes("must be accepted") ||
      code.includes("not assigned") ||
      code.includes("current state")
        ? 409
        : code.includes("Fulfillment not found") || code.includes("Dispatch request not found")
          ? 404
          : 500;

    return NextResponse.json(
      { message: "Unable to transition delivery.", code },
      { status },
    );
  }
}
