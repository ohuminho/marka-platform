import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import {
  paymentQueryService,
} from "@/services/payments/payment-query.service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext
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

    const session =
      await new SessionService().validate(
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

    const {
      id,
    } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          message:
            "Payment id is required.",
          code:
            "PAYMENT_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const payment =
      await paymentQueryService.getForUser(
        {
          userId:
            session.userId,
          paymentId:
            id.trim(),
        }
      );

    if (!payment) {
      return NextResponse.json(
        {
          message:
            "Payment not found.",
          code:
            "PAYMENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      payment
    );
  } catch (error) {
    console.error(
      "[PAYMENT_DETAIL_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load payment.",
        code:
          "PAYMENT_DETAIL_FAILED",
      },
      { status: 500 }
    );
  }
}
