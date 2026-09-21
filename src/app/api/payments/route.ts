import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { PaymentService } from "@/services/payments/payment.service";

export async function POST(
  request: Request
) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      AuthConfig.cookies.name
    )?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    const sessionService = new SessionService();

    const session = await sessionService.validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const orderId =
      typeof body?.orderId === "string"
        ? body.orderId.trim()
        : "";

    const amount =
      typeof body?.amount === "number"
        ? body.amount
        : null;

    if (!orderId) {
      return NextResponse.json(
        {
          message: "Order id is required.",
          code: "ORDER_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (
      amount === null ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message: "A valid payment amount is required.",
          code: "INVALID_PAYMENT_AMOUNT",
        },
        { status: 400 }
      );
    }

    const paymentService =
      new PaymentService();

    const payment =
      await paymentService.createPayment(
        session.userId,
        orderId,
        amount
      );

    return NextResponse.json(payment, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "[PAYMENT_CREATE_API_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to create payment.",
        code: "PAYMENT_CREATION_FAILED",
      },
      { status: 500 }
    );
  }
}
