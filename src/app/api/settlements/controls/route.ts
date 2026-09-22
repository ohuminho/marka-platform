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
  settlementFinancialControlsService,
} from "@/services/settlements/settlement-financial-controls.service";

export async function GET(
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
        {
          status: 401,
        }
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
        {
          status: 401,
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const organizationId =
      url.searchParams
        .get("organizationId")
        ?.trim() ?? "";

    if (!organizationId) {
      return NextResponse.json(
        {
          message:
            "Organization id is required.",
          code:
            "ORGANIZATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const authorization =
      new AuthorizationService();

    const authorized =
      await authorization.hasPermission(
        session.userId,
        Permissions.ADMIN_ACCESS,
        organizationId
      );

    if (!authorized) {
      return NextResponse.json(
        {
          message:
            "You are not authorized to access settlement financial controls.",
          code:
            "SETTLEMENT_CONTROLS_FORBIDDEN",
        },
        {
          status: 403,
        }
      );
    }

    const result =
      await settlementFinancialControlsService.inspect(
        organizationId
      );

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[SETTLEMENT_FINANCIAL_CONTROLS_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Settlement financial controls inspection failed.";

    if (
      message ===
      "Organization ID is required."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "ORGANIZATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Settlement financial controls inspection failed.",
        code:
          "SETTLEMENT_FINANCIAL_CONTROLS_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
