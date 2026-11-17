import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { prisma } from "@/database/client/prisma";
import { PaymentService } from "@/services/payments/payment.service";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session.", code: "INVALID_SESSION" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { id } = await params;
    const orderId = id.trim();
    if (!orderId) {
      return NextResponse.json(
        { message: "Order id is required.", code: "ORDER_ID_REQUIRED" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.userId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found.", code: "ORDER_NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return NextResponse.json(
        { message: "Cancelled or refunded orders cannot restart delivery.", code: "ORDER_NOT_RECOVERABLE" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const quota = await reserveApiRequest({
      scope: "ORDER_FULFILLMENT_RECOVERY",
      actorUserId: session.userId,
      windows: [
        { limit: 5, windowMs: 5 * 60 * 1000 },
        { limit: 20, windowMs: 60 * 60 * 1000 },
      ],
    });

    if (!quota.allowed) {
      return NextResponse.json(
        {
          message: "Too many delivery recovery attempts. Try again later.",
          code: "FULFILLMENT_RECOVERY_RATE_LIMITED",
          retryAfterSeconds: quota.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(quota.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const completedPayment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: "COMPLETED",
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (!completedPayment) {
      return NextResponse.json(
        { message: "A completed payment is required before delivery can be recovered.", code: "COMPLETED_PAYMENT_REQUIRED" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    // The payment service's completed-payment path does not contact the
    // gateway again. It safely re-runs inventory finalization and the
    // idempotent fulfillment/dispatch handoff for this same order.
    const payment = await new PaymentService().confirmPayment({
      userId: session.userId,
      paymentId: completedPayment.id,
      idempotencyKey: `order-fulfillment-recovery:${order.id}:${completedPayment.id}`,
    });

    const fulfillment = await prisma.fulfillmentRequest.findUnique({
      where: { orderId: order.id },
      select: { id: true, status: true, exceptionCode: true },
    });

    const dispatch = fulfillment
      ? await prisma.dispatchRequest.findFirst({
          where: {
            subjectType: "FULFILLMENT",
            subjectId: fulfillment.id,
          },
          select: { id: true, status: true },
        })
      : null;

    return NextResponse.json(
      {
        message: "Delivery recovery processed.",
        paymentStatus: payment.status,
        fulfillment,
        dispatch,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[ORDER_FULFILLMENT_RECOVERY_ERROR]", error);
    return NextResponse.json(
      {
        message: "Unable to recover this order's delivery. The payment remains recorded; contact support if the problem persists.",
        code: "ORDER_FULFILLMENT_RECOVERY_FAILED",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
