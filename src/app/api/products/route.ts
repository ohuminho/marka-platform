import { NextResponse } from "next/server";

import { MarketplaceService } from "@/services/marketplace/marketplace.service";

export const dynamic = "force-dynamic";

const allowedSorts = new Set(["latest", "price_asc", "price_desc"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSearch = searchParams.get("search") ?? "";
    const search = rawSearch.trim().slice(0, 120) || undefined;
    const categoryId = searchParams.get("categoryId")?.trim() || undefined;
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const requestedSort = searchParams.get("sortBy") ?? "latest";
    const sortBy = allowedSorts.has(requestedSort) ? requestedSort : "latest";

    const service = new MarketplaceService();
    const [products, categories] = await Promise.all([
      service.getProducts({ search, categoryId, verifiedOnly, sortBy }),
      service.getCategories(),
    ]);

    return NextResponse.json(
      { products, categories },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("[PRODUCTS_LIST_ERROR]", error);
    return NextResponse.json(
      { message: "Unable to load products.", code: "PRODUCTS_LIST_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
