import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { OrderService } from "@/services/orders/order.service";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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
          code: "INVALID_SESSION",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const orderId = id.trim();

    if (!orderId) {
      return NextResponse.json(
        {
          message:
            "Order id is required.",
          code: "ORDER_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const orderService =
      new OrderService();

    const order =
      await orderService.getOrderById(
        orderId,
        session.userId
      );

    return NextResponse.json(order);
  } catch (error) {
    console.error(
      "[ORDER_GET_ERROR]",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "Order not found."
    ) {
      return NextResponse.json(
        {
          message:
            "Order not found.",
          code: "ORDER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Unable to load order.",
        code: "ORDER_LOAD_FAILED",
      },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    const orderId = id.trim();

    if (!orderId) {
      return NextResponse.json(
        {
          message: "Order id is required.",
          code: "ORDER_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));

    if (body?.status !== "CANCELLED") {
      return NextResponse.json(
        {
          message: "Only order cancellation is supported by this endpoint.",
          code: "UNSUPPORTED_ORDER_UPDATE",
        },
        { status: 400 },
      );
    }

    const orderService = new OrderService();

    await orderService.getOrderById(
      orderId,
      session.userId,
    );

    const order = await orderService.updateOrderStatus(
      orderId,
      "CANCELLED" as import("@/services/orders/types/order.types").OrderStatus,
    );

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_PATCH_ERROR]", error);

    if (
      error instanceof Error &&
      error.message === "Order not found."
    ) {
      return NextResponse.json(
        {
          message: "Order not found.",
          code: "ORDER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Unsupported order status")
    ) {
      return NextResponse.json(
        {
          message: "Unsupported order status.",
          code: "UNSUPPORTED_ORDER_STATUS",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Unable to update order.",
        code: "ORDER_UPDATE_FAILED",
      },
      { status: 409 },
    );
  }
}
