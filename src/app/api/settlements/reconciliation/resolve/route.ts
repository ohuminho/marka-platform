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
  settlementReconciliationResolutionService,
} from "@/services/settlements/settlement-reconciliation-resolution.service";

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

    const reconciliationId =
      typeof body?.reconciliationId ===
      "string"
        ? body.reconciliationId.trim()
        : "";

    const resolutionCode =
      typeof body?.resolutionCode ===
      "string"
        ? body.resolutionCode.trim()
        : "";

    const resolutionNote =
      typeof body?.resolutionNote ===
      "string"
        ? body.resolutionNote.trim()
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

    if (!reconciliationId) {
      return NextResponse.json(
        {
          message:
            "Reconciliation id is required.",
          code:
            "RECONCILIATION_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!resolutionCode) {
      return NextResponse.json(
        {
          message:
            "Resolution code is required.",
          code:
            "RESOLUTION_CODE_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!resolutionNote) {
      return NextResponse.json(
        {
          message:
            "Resolution note is required.",
          code:
            "RESOLUTION_NOTE_REQUIRED",
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
        Permissions.SETTLEMENT_RECONCILIATION_RESOLVE,
        organizationId
      );

    if (!authorized) {
      return NextResponse.json(
        {
          message:
            "You are not authorized to resolve settlement reconciliation mismatches.",
          code:
            "SETTLEMENT_RECONCILIATION_RESOLUTION_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const result =
      await settlementReconciliationResolutionService.resolve(
        {
          organizationId,
          reconciliationId,
          actorUserId:
            session.userId,
          resolutionCode,
          resolutionNote,
          idempotencyKey,
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
      "[SETTLEMENT_RECONCILIATION_RESOLUTION_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Settlement reconciliation resolution failed.";

    if (
      message ===
      "Reconciliation not found."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "RECONCILIATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      message.includes(
        "Only a mismatched reconciliation"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "RECONCILIATION_NOT_RESOLVABLE",
        },
        { status: 409 }
      );
    }

    if (
      message.includes(
        "Invalid reconciliation resolution code"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "INVALID_RESOLUTION_CODE",
        },
        { status: 400 }
      );
    }

    if (
      message.includes(
        "Resolution note"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "INVALID_RESOLUTION_NOTE",
        },
        { status: 400 }
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
          "Settlement reconciliation resolution failed.",
        code:
          "SETTLEMENT_RECONCILIATION_RESOLUTION_FAILED",
      },
      { status: 500 }
    );
  }
}
