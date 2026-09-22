import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AuthConfig,
} from "@/core/authentication/auth.config";

import {
  SessionService,
} from "@/core/auth/sessions/session.service";

import {
  AuthorizationService,
} from "@/core/authorization/authorization.service";

import {
  Permissions,
} from "@/core/authorization/permissions.catalog";

import {
  settlementPayoutService,
} from "@/services/settlements/settlement-payout.service";

function getClientIp(
  request: Request
): string | undefined {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return forwarded
      .split(",")[0]
      ?.trim();
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) ?? undefined
  );
}

function getRequestContext(
  request: Request
) {
  return {
    requestId:
      request.headers.get(
        "x-request-id"
      ) ?? undefined,

    correlationId:
      request.headers.get(
        "x-correlation-id"
      ) ?? undefined,

    ipAddress:
      getClientIp(request),

    userAgent:
      request.headers.get(
        "user-agent"
      ) ?? undefined,
  };
}

export async function POST(
  request: Request
) {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        AuthConfig.cookies.name
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          message:
            "Authentication required.",
          code:
            "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    const sessionService =
      new SessionService();

    const session =
      await sessionService.validate(
        token
      );

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Invalid or expired session.",
          code:
            "INVALID_SESSION",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const organizationId =
      typeof body?.organizationId ===
      "string"
        ? body.organizationId.trim()
        : "";

    const settlementId =
      typeof body?.settlementId ===
      "string"
        ? body.settlementId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : request.headers
            .get("Idempotency-Key")
            ?.trim();

    if (!organizationId) {
      return NextResponse.json(
        {
          message:
            "Organization id is required.",
          code:
            "ORGANIZATION_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!settlementId) {
      return NextResponse.json(
        {
          message:
            "Settlement id is required.",
          code:
            "SETTLEMENT_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          message:
            "Idempotency key is required.",
          code:
            "IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 }
      );
    }

    const authorization =
      new AuthorizationService();

    const authorized =
      await authorization.hasPermission(
        session.userId,
        Permissions.SETTLEMENT_PAYOUT_EXECUTE,
        organizationId
      );

    if (!authorized) {
      return NextResponse.json(
        {
          message:
            "You are not authorized to execute settlement payouts.",
          code:
            "SETTLEMENT_PAYOUT_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const context =
      getRequestContext(request);

    const result =
      await settlementPayoutService.execute(
        {
          organizationId,
          settlementId,
          actorUserId:
            session.userId,
          idempotencyKey,
          ...context,
        }
      );

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[SETTLEMENT_PAYOUT_EXECUTE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Settlement payout execution failed.";

    if (
      message ===
      "Settlement not found."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "SETTLEMENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      message.includes(
        "is not configured."
      ) ||
      message ===
        "Settlement provider is required."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "SETTLEMENT_PROVIDER_NOT_CONFIGURED",
        },
        { status: 409 }
      );
    }

    if (
      message.includes(
        "financial instrument"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "SETTLEMENT_FINANCIAL_INSTRUMENT_INVALID",
        },
        { status: 409 }
      );
    }

    if (
      message.includes(
        "cannot be processed"
      ) ||
      message.includes(
        "cannot be synchronized"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "SETTLEMENT_NOT_PROCESSABLE",
        },
        { status: 409 }
      );
    }

    if (
      message.includes(
        "Idempotency"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "IDEMPOTENCY_CONFLICT",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Settlement payout execution failed.",
        code:
          "SETTLEMENT_PAYOUT_EXECUTION_FAILED",
      },
      { status: 500 }
    );
  }
}
