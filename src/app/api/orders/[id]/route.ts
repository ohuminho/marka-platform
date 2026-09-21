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

    const { id } = await params;

    const orderId = id.trim();

    if (!orderId) {
      return NextResponse.json(
        {
          message: "Order id is required.",
          code: "ORDER_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const orderService = new OrderService();

    const order =
      await orderService.getOrderById(
        orderId
      );

    return NextResponse.json(order);
  } catch (error) {
    console.error(
      "[ORDER_GET_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to load order.",
        code: "ORDER_LOAD_FAILED",
      },
      { status: 500 }
    );
  }
}
