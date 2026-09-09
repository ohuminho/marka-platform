import { NextResponse } from "next/server";
import { ProductService } from "@/services/products/product.service";

export async function POST(request: Request) {
  const body = await request.json();

  const service = new ProductService();

  const product = await service.createProduct(
    body.storeId,
    body.name,
    body.price,
    body.description
  );

  return NextResponse.json(product);
}
