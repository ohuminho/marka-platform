import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { deliveryAgentService } from "@/services/delivery/agents/delivery-agent.service";

const schema = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  transportMode: z.enum(["WALK", "BICYCLE", "MOTORCYCLE", "CAR", "VAN"]),
  displayName: z.string().trim().min(2).max(160).optional(),
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

    const isSelfRegistration =
      !parsed.data.userId || parsed.data.userId === session.userId;

    let organizationId = parsed.data.organizationId;
    let userId = parsed.data.userId ?? session.userId;

    if (isSelfRegistration) {
      const platformOrganization = await prisma.organization.findFirst({
        where: {
          slug: "marka-platform",
          type: "PLATFORM",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!platformOrganization) {
        return NextResponse.json(
          { message: "MARKA platform organization is not configured.", code: "PLATFORM_ORGANIZATION_NOT_CONFIGURED" },
          { status: 503 },
        );
      }

      const membership = await prisma.organizationMembership.findFirst({
        where: {
          userId: session.userId,
          organizationId: platformOrganization.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          { message: "Active MARKA platform membership is required.", code: "PLATFORM_MEMBERSHIP_REQUIRED" },
          { status: 403 },
        );
      }

      organizationId = platformOrganization.id;
      userId = session.userId;
    } else {
      if (!organizationId || !userId) {
        return NextResponse.json(
          { message: "Organization and user are required for administrator registration.", code: "INVALID_ADMIN_REGISTRATION_TARGET" },
          { status: 400 },
        );
      }

      const authorization = new AuthorizationService();
      if (
        !(await authorization.hasPermission(
          session.userId,
          Permissions.DELIVERY_AGENT_MANAGE,
          organizationId,
        ))
      ) {
        return NextResponse.json(
          {
            message: "You do not have permission to manage delivery agents.",
            code: "DELIVERY_AGENT_MANAGE_FORBIDDEN",
          },
          { status: 403 },
        );
      }
    }

    const agent = await deliveryAgentService.register({
      organizationId: organizationId!,
      userId: userId!,
      transportMode: parsed.data.transportMode,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone,
    });

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
