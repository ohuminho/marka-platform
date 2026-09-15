import { NextResponse } from "next/server";

import {
  MarketplaceService,
} from "@/services/marketplace/marketplace.service";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search") ||
      undefined;

    const categoryId =
      searchParams.get("categoryId") ||
      undefined;

    const verifiedOnly =
      searchParams.get("verifiedOnly") ===
      "true";

    const allowedSorts = new Set([
      "latest",
      "price_asc",
      "price_desc",
    ]);

    const requestedSort =
      searchParams.get("sortBy") ||
      "latest";

    const sortBy = allowedSorts.has(
      requestedSort
    )
      ? requestedSort
      : "latest";

    const service =
      new MarketplaceService();

    const products =
      await service.getProducts({
        search,
        categoryId,
        verifiedOnly,
        sortBy,
      });

    return NextResponse.json({
      products,
    });
  } catch (error) {
    console.error(
      "[MARKETPLACE_PRODUCTS_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load marketplace products.",
        code: "MARKETPLACE_PRODUCTS_FAILED",
      },
      { status: 500 }
    );
  }
}
