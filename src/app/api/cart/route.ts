import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CartService } from "@/services/cart/cart.service";

export async function GET() {
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

    const cartService = new CartService();

    const cart =
      await cartService.getCart(user.id);

    return NextResponse.json(cart);
  } catch (error) {
    console.error("[CART_GET_ERROR]", error);

    return NextResponse.json(
      {
        message: "Unable to load cart.",
        code: "CART_LOAD_FAILED",
      },
      { status: 500 }
    );
  }
}
