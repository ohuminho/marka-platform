import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/database/client/prisma";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export interface MobilityApiSession {
  userId: string;
  organizationId: string;
}

export async function authenticateMobilityRequest(
  request: Request
): Promise<
  | {
      ok: true;
      session: MobilityApiSession;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    AuthConfig.cookies.name
  )?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  const sessionService = new SessionService();

  const session = await sessionService.validate(token);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (
    !user ||
    user.status === "SUSPENDED" ||
    user.status === "LOCKED" ||
    user.status === "DELETED"
  ) {
    await sessionService.revoke(token);

    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "User account is not available.",
          code: "USER_ACCOUNT_UNAVAILABLE",
        },
        { status: 401 }
      ),
    };
  }

  const organizationId =
    request.headers
      .get("X-Organization-Id")
      ?.trim() || "";

  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "X-Organization-Id header is required.",
          code: "ORGANIZATION_ID_REQUIRED",
        },
        { status: 400 }
      ),
    };
  }

  const membership =
    await prisma.organizationMembership.findFirst({
      where: {
        userId: session.userId,
        organizationId,
        status: "ACTIVE",
        organization: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "User is not an active member of the specified organization.",
          code:
            "ORGANIZATION_ACCESS_DENIED",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session: {
      userId: session.userId,
      organizationId:
        membership.organizationId,
    },
  };
}

export function getIdempotencyKey(
  request: Request,
  body?: unknown
): string {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>)
      .idempotencyKey === "string"
  ) {
    const value = (
      body as Record<string, unknown>
    ).idempotencyKey as string;

    if (value.trim()) {
      return value.trim();
    }
  }

  return (
    request.headers
      .get("Idempotency-Key")
      ?.trim() || ""
  );
}

export function getRequestContext(
  request: Request
) {
  return {
    requestId:
      request.headers
        .get("X-Request-Id")
        ?.trim() || undefined,

    correlationId:
      request.headers
        .get("X-Correlation-Id")
        ?.trim() || undefined,

    ipAddress:
      request.headers
        .get("X-Forwarded-For")
        ?.split(",")[0]
        ?.trim() ||
      request.headers
        .get("X-Real-IP")
        ?.trim() ||
      undefined,

    userAgent:
      request.headers
        .get("User-Agent")
        ?.trim() || undefined,
  };
}
