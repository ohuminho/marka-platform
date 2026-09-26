import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import {
  PaymentService,
} from "@/services/payments/payment.service";
import {
  paymentQueryService,
} from "@/services/payments/payment-query.service";

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

    const url =
      new URL(request.url);

    const limitParam =
      Number(
        url.searchParams.get(
          "limit"
        ) ?? "20"
      );

    const offsetParam =
      Number(
        url.searchParams.get(
          "offset"
        ) ?? "0"
      );

    const status =
      url.searchParams.get(
        "status"
      ) ?? undefined;

    const result =
      await paymentQueryService.listForUser(
        {
          userId:
            session.userId,
          status:
            status as
              | undefined,
          limit:
            Number.isFinite(
              limitParam
            )
              ? limitParam
              : 20,
          offset:
            Number.isFinite(
              offsetParam
            )
              ? offsetParam
              : 0,
        }
      );

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "[PAYMENT_LIST_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load payments.",
        code:
          "PAYMENT_LIST_FAILED",
      },
      { status: 500 }
    );
  }
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

    const body =
      await request.json();

    const orderId =
      typeof body?.orderId ===
      "string"
        ? body.orderId.trim()
        : "";

    const provider =
      typeof body?.provider ===
      "string"
        ? body.provider.trim()
        : undefined;

    const idempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : request.headers.get(
            "Idempotency-Key"
          )?.trim();

    if (!orderId) {
      return NextResponse.json(
        {
          message:
            "Order id is required.",
          code:
            "ORDER_ID_REQUIRED",
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

    const payment =
      await new PaymentService().createPayment(
        {
          userId:
            session.userId,
          orderId,
          idempotencyKey,
          provider,
        }
      );

    return NextResponse.json(
      payment,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[PAYMENT_CREATE_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create payment.";

    if (
      message ===
      "Order not found."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "ORDER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "This order cannot receive a payment."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "ORDER_NOT_PAYABLE",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "An active payment already exists for this order."
    ) {
      return NextResponse.json(
        {
          message,
          code:
            "ACTIVE_PAYMENT_EXISTS",
        },
        { status: 409 }
      );
    }

    if (
      message.includes(
        "Idempotency key"
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
          "Unable to create payment.",
        code:
          "PAYMENT_CREATION_FAILED",
      },
      { status: 500 }
    );
  }
}
