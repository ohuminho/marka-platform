import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketplace/marketplace.service";

export async function GET() {
  const service = new MarketplaceService();

  const products = await service.getProducts();

  return NextResponse.json(products);
}
