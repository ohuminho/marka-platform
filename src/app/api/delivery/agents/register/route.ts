import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { deliveryAgentService } from "@/services/delivery/agents/delivery-agent.service";

const schema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  transportMode: z.enum([
    "WALK",
    "BICYCLE",
    "MOTORCYCLE",
    "CAR",
    "VAN",
  ]),
  displayName: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
});

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

export async function POST(request: Request) {
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

    const parsed = schema.safeParse(
      await request.json(),
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            "Invalid delivery agent registration data.",
          code: "INVALID_DELIVERY_AGENT_DATA",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const authorization =
      new AuthorizationService();

    if (
      !(await authorization.hasPermission(
        session.userId,
        Permissions.DELIVERY_AGENT_MANAGE,
        parsed.data.organizationId,
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

    const agent =
      await deliveryAgentService.register(
        parsed.data,
      );

    return NextResponse.json(
      { agent },
      { status: 201 },
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_REGISTRATION_FAILED";

    const status =
      code ===
        "DELIVERY_AGENT_ALREADY_REGISTERED" ||
      code ===
        "DELIVERY_AGENT_USER_NOT_IN_ORGANIZATION"
        ? 409
        : 500;

    return NextResponse.json(
      {
        message:
          "Unable to register delivery agent.",
        code,
      },
      { status },
    );
  }
}
