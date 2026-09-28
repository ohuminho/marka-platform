import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { deliveryAgentManagementService } from "@/services/delivery/agents/delivery-agent-management.service";

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

export async function GET(request: Request) {
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

    const url = new URL(request.url);

    const organizationId =
      url.searchParams
        .get("organizationId")
        ?.trim() ?? "";

    const limit = Number(
      url.searchParams.get("limit") ?? "50",
    );

    const offset = Number(
      url.searchParams.get("offset") ?? "0",
    );

    if (!organizationId) {
      return NextResponse.json(
        {
          message: "Organization ID is required.",
          code:
            "DELIVERY_AGENT_ORGANIZATION_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      return NextResponse.json(
        {
          message: "Invalid pagination.",
          code: "INVALID_PAGINATION",
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
        organizationId,
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

    const result =
      await deliveryAgentManagementService.list({
        organizationId,
        limit,
        offset,
      });

    return NextResponse.json(result);
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "DELIVERY_AGENT_LIST_FAILED";

    return NextResponse.json(
      {
        message: "Unable to list delivery agents.",
        code,
      },
      { status: 500 },
    );
  }
}
