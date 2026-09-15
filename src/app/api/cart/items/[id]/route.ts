import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CartService } from "@/services/cart/cart.service";

const quantitySchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1."),
});

async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("marka_session")?.value;

  if (!token) {
    return {
      token: null,
      user: null,
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    } as const;
  }

  const sessionService = new SessionService();

  const session =
    await sessionService.validate(token);

  if (!session) {
    return {
      token,
      user: null,
      status: 401,
      code: "INVALID_SESSION",
    } as const;
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

    return {
      token,
      user: null,
      status: 401,
      code: "USER_NOT_FOUND",
    } as const;
  }

  if (user.status !== "ACTIVE") {
    await sessionService.revoke(token);

    return {
      token,
      user: null,
      status: 403,
      code: "USER_NOT_ACTIVE",
    } as const;
  }

  return {
    token,
    user,
    status: 200,
    code: null,
  } as const;
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth =
      await getAuthenticatedUser();

    if (!auth.user) {
      return NextResponse.json(
        {
          message:
            auth.code ===
            "USER_NOT_ACTIVE"
              ? "User account is not active."
              : "Authentication required.",
          code: auth.code,
        },
        { status: auth.status }
      );
    }

    const { id } =
      await context.params;

    const body = await request.json();

    const parsed =
      quantitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid quantity.",
          code: "INVALID_QUANTITY",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const cartService = new CartService();

    const item =
      await cartService.updateItem(
        auth.user.id,
        id,
        parsed.data.quantity
      );

    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update cart item.";

    if (
      message ===
      "Cart item not found."
    ) {
      return NextResponse.json(
        {
          message,
          code: "CART_ITEM_NOT_FOUND",
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
      "[CART_UPDATE_ITEM_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to update cart item.",
        code: "CART_ITEM_UPDATE_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth =
      await getAuthenticatedUser();

    if (!auth.user) {
      return NextResponse.json(
        {
          message:
            auth.code ===
            "USER_NOT_ACTIVE"
              ? "User account is not active."
              : "Authentication required.",
          code: auth.code,
        },
        { status: auth.status }
      );
    }

    const { id } =
      await context.params;

    const cartService = new CartService();

    const item =
      await cartService.removeItem(
        auth.user.id,
        id
      );

    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to remove cart item.";

    if (
      message ===
      "Cart item not found."
    ) {
      return NextResponse.json(
        {
          message,
          code: "CART_ITEM_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.error(
      "[CART_REMOVE_ITEM_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to remove cart item.",
        code: "CART_ITEM_REMOVE_FAILED",
      },
      { status: 500 }
    );
  }
}
