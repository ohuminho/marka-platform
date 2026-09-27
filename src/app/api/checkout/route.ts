import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import {
  CheckoutService,
} from "@/services/checkout/checkout.service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      AuthConfig.cookies.name,
    )?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
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
        { status: 401 },
      );
    }

    const body = await request.json();

    const cartId =
      typeof body?.cartId === "string"
        ? body.cartId.trim()
        : "";

    const paymentIdempotencyKey =
      typeof body?.paymentIdempotencyKey === "string"
        ? body.paymentIdempotencyKey.trim()
        : "";

    const provider =
      typeof body?.provider === "string"
        ? body.provider.trim()
        : undefined;

    const delivery =
      body?.delivery &&
      typeof body.delivery === "object" &&
      !Array.isArray(body.delivery)
        ? {
            address:
              typeof body.delivery.address === "string"
                ? body.delivery.address.trim()
                : "",
            latitude:
              typeof body.delivery.latitude === "number"
                ? body.delivery.latitude
                : Number.NaN,
            longitude:
              typeof body.delivery.longitude === "number"
                ? body.delivery.longitude
                : Number.NaN,
            instructions:
              typeof body.delivery.instructions === "string"
                ? body.delivery.instructions.trim()
                : undefined,
          }
        : undefined;

    const metadata =
      body?.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? body.metadata
        : undefined;

    if (!cartId) {
      return NextResponse.json(
        {
          message: "Cart id is required.",
          code: "CART_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (!paymentIdempotencyKey) {
      return NextResponse.json(
        {
          message:
            "Payment idempotency key is required.",
          code: "PAYMENT_IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 },
      );
    }

    const checkoutService = new CheckoutService();

    const result = await checkoutService.checkout({
      userId: session.userId,
      cartId,
      paymentIdempotencyKey,
      provider,
      delivery,
      metadata,
      correlationId:
        request.headers.get("x-correlation-id") ??
        undefined,
      requestId:
        request.headers.get("x-request-id") ??
        undefined,
      ipAddress:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        undefined,
      userAgent:
        request.headers.get("user-agent") ??
        undefined,
    });

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "[CHECKOUT_API_ERROR]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Checkout failed.";

    if (message === "Delivery destination is required.") {
      return NextResponse.json({ message, code: "DELIVERY_DESTINATION_REQUIRED" }, { status: 400 });
    }

    if (message === "Delivery address is required.") {
      return NextResponse.json({ message, code: "DELIVERY_ADDRESS_REQUIRED" }, { status: 400 });
    }

    if (message.startsWith("Delivery latitude")) {
      return NextResponse.json({ message, code: "INVALID_DELIVERY_LATITUDE" }, { status: 400 });
    }

    if (message.startsWith("Delivery longitude")) {
      return NextResponse.json({ message, code: "INVALID_DELIVERY_LONGITUDE" }, { status: 400 });
    }

    if (
      message ===
      "Active cart not found."
    ) {
      return NextResponse.json(
        {
          message,
          code: "ACTIVE_CART_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (message === "Cart is empty.") {
      return NextResponse.json(
        {
          message,
          code: "CART_EMPTY",
        },
        { status: 409 },
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
        { status: 409 },
      );
    }

    if (
      message.startsWith('Product "') &&
      message.endsWith(
        '" is not available.',
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "PRODUCT_UNAVAILABLE",
        },
        { status: 409 },
      );
    }

    if (
      message.startsWith(
        "Product \"",
      ) &&
      message.includes(
        "has an invalid price.",
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "INVALID_PRODUCT_PRICE",
        },
        { status: 409 },
      );
    }

    if (
      message.includes(
        "multiple stores. Multi-store checkout is not yet supported",
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "MULTI_STORE_CHECKOUT_UNSUPPORTED",
        },
        { status: 409 },
      );
    }

    if (
      message.startsWith(
        "Insufficient stock for product",
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "INSUFFICIENT_STOCK",
        },
        { status: 409 },
      );
    }

    if (
      message.startsWith(
        "Stock changed while checking out product",
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Stock changed while completing checkout. Please review your cart and try again.",
          code: "CHECKOUT_STOCK_CONFLICT",
        },
        { status: 409 },
      );
    }

    if (
      message.includes(
        "payment intent could not be created",
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "PAYMENT_INTENT_CREATION_FAILED",
        },
        { status: 502 },
      );
    }

    if (
      message.includes(
        "Idempotency key",
      )
    ) {
      return NextResponse.json(
        {
          message,
          code: "IDEMPOTENCY_CONFLICT",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Unable to complete checkout.",
        code: "CHECKOUT_FAILED",
      },
      { status: 500 },
    );
  }
}
