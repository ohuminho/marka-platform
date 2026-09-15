import { NextResponse } from "next/server";

import {
  prisma,
} from "@/database/client/prisma";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const product =
      await prisma.product.findFirst({
        where: {
          id,
          status: "ACTIVE",
        },
        include: {
          store: {
            include: {
              vendor: true,
            },
          },
          category: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          message: "Product not found.",
          code: "PRODUCT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product,
    });
  } catch (error) {
    console.error(
      "[MARKETPLACE_PRODUCT_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load marketplace product.",
        code: "MARKETPLACE_PRODUCT_FAILED",
      },
      { status: 500 }
    );
  }
}
