import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { CheckoutService } from "@/services/checkout/checkout.service";

export async function POST(request: Request) {
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

    const cartId =
      typeof body?.cartId === "string"
        ? body.cartId.trim()
        : "";

    if (!cartId) {
      return NextResponse.json(
        {
          message: "Cart id is required.",
          code: "CART_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const checkoutService = new CheckoutService();

    const result = await checkoutService.checkout(
      session.userId,
      cartId
    );

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "[CHECKOUT_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Checkout failed.";

    if (
      message === "Active cart not found."
    ) {
      return NextResponse.json(
        {
          message,
          code: "ACTIVE_CART_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (message === "Cart is empty.") {
      return NextResponse.json(
        {
          message,
          code: "CART_EMPTY",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "Cart contains an invalid quantity."
    ) {
      return NextResponse.json(
        {
          message,
          code: "INVALID_CART_QUANTITY",
        },
        { status: 409 }
      );
    }

    if (
      message.startsWith(
        "Product \""
      ) &&
      message.endsWith(
        "\" is not available."
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "PRODUCT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    if (
      message.startsWith(
        "Insufficient stock for product"
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "INSUFFICIENT_STOCK",
        },
        { status: 409 }
      );
    }

    if (
      message.startsWith(
        "Stock changed while checking out product"
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Stock changed while completing checkout. Please review your cart and try again.",
          code: "CHECKOUT_STOCK_CONFLICT",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Unable to complete checkout.",
        code: "CHECKOUT_FAILED",
      },
      { status: 500 }
    );
  }
}
