import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import {
  PaymentService,
} from "@/services/payments/payment.service";

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

    const paymentId =
      typeof body?.paymentId ===
      "string"
        ? body.paymentId.trim()
        : "";

    const provider =
      typeof body?.provider ===
      "string"
        ? body.provider.trim()
        : undefined;

    const providerPaymentId =
      typeof body?.providerPaymentId ===
      "string"
        ? body.providerPaymentId.trim()
        : undefined;

    const idempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : request.headers.get(
            "Idempotency-Key"
          )?.trim();

    if (!paymentId) {
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

    const paymentService =
      new PaymentService();

    const result =
      await paymentService.confirmPayment(
        {
          userId:
            session.userId,
          paymentId,
          idempotencyKey,
          provider,
          providerPaymentId,
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
      "[PAYMENT_CONFIRM_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Payment confirmation failed.";

    if (
      message ===
      "Payment not found."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "PAYMENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "Payment provider is required." ||
      message.endsWith(
        "is not configured."
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "PAYMENT_PROVIDER_NOT_CONFIGURED",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "Provider payment id is required."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "PROVIDER_PAYMENT_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (
      message.includes(
        "can no longer be confirmed"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "PAYMENT_NOT_CONFIRMABLE",
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
          "Payment confirmation failed.",
        code:
          "PAYMENT_CONFIRMATION_FAILED",
      },
      { status: 500 }
    );
  }
}
