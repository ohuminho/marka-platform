import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CartService } from "@/services/cart/cart.service";

const addCartItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1."),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get("marka_session")?.value;

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

    const session =
      await sessionService.validate(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      await sessionService.revoke(token);

      return NextResponse.json(
        {
          message: "User account was not found.",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      await sessionService.revoke(token);

      return NextResponse.json(
        {
          message: "User account is not active.",
          code: "USER_NOT_ACTIVE",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parsed =
      addCartItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid cart item data.",
          code: "INVALID_CART_ITEM_DATA",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const cartService = new CartService();

    await cartService.addItem(
      user.id,
      parsed.data.productId,
      parsed.data.quantity
    );

    const cart =
      await cartService.getCart(user.id);

    return NextResponse.json(cart);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to add item.";

    if (
      message === "Product not found."
    ) {
      return NextResponse.json(
        {
          message,
          code: "PRODUCT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (
      message === "Product unavailable."
    ) {
      return NextResponse.json(
        {
          message,
          code: "PRODUCT_UNAVAILABLE",
        },
        { status: 400 }
      );
    }

    if (
      message === "Insufficient stock."
    ) {
      return NextResponse.json(
        {
          message,
          code: "INSUFFICIENT_STOCK",
        },
        { status: 409 }
      );
    }

    console.error(
      "[CART_ADD_ITEM_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to add item.",
        code: "CART_ITEM_ADD_FAILED",
      },
      { status: 500 }
    );
  }
}
