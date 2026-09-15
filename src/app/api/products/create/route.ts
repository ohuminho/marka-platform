import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { ProductService } from "@/services/products/product.service";

const createProductSchema = z.object({
  storeId: z
    .string()
    .uuid("Invalid store ID."),

  name: z
    .string()
    .trim()
    .min(2, "Product name must contain at least 2 characters.")
    .max(200, "Product name is too long."),

  price: z
    .number()
    .finite()
    .positive("Product price must be greater than zero."),

  description: z
    .string()
    .trim()
    .max(5000, "Product description is too long.")
    .optional(),
});

export async function POST(request: Request) {
  try {
    const sessionToken =
      request.headers.get("cookie")?.match(
        /(?:^|;\s*)marka_session=([^;]+)/
      )?.[1];

    if (!sessionToken) {
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
      await sessionService.validate(sessionToken);

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
      await sessionService.revoke(sessionToken);

      return NextResponse.json(
        {
          message: "User account was not found.",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      await sessionService.revoke(sessionToken);

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
      createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid product data.",
          code: "INVALID_PRODUCT_DATA",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const store =
      await prisma.store.findUnique({
        where: {
          id: parsed.data.storeId,
        },
        select: {
          id: true,
          vendor: {
            select: {
              ownerId: true,
              organizationId: true,
            },
          },
        },
      });

    if (!store) {
      return NextResponse.json(
        {
          message: "Store not found.",
          code: "STORE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (store.vendor.ownerId !== user.id) {
      return NextResponse.json(
        {
          message:
            "You do not have access to this store.",
          code: "STORE_ACCESS_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const authorization =
      new AuthorizationService();

    const hasPermission =
      await authorization.hasPermission(
        user.id,
        Permissions.PRODUCT_CREATE,
        store.vendor.organizationId
      );

    if (!hasPermission) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to create products.",
          code: "PRODUCT_CREATE_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const service = new ProductService();

    const product =
      await service.createProduct(
        user.id,
        parsed.data.storeId,
        parsed.data.name,
        parsed.data.price,
        parsed.data.description
      );

    return NextResponse.json(
      {
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[PRODUCT_CREATE_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to create product.",
        code: "PRODUCT_CREATE_FAILED",
      },
      { status: 500 }
    );
  }
}
