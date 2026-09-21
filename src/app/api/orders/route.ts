import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { OrderService } from "@/services/orders/order.service";

export async function GET() {
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

    const orderService = new OrderService();

    const orders =
      await orderService.getUserOrders(
        session.userId
      );

    return NextResponse.json(orders);
  } catch (error) {
    console.error(
      "[ORDERS_GET_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to load orders.",
        code: "ORDERS_LOAD_FAILED",
      },
      { status: 500 }
    );
  }
}
