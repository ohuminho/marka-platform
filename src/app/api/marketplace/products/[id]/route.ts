import { NextResponse } from "next/server";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await prisma.product.findFirst({
      where: {
        id,
        status: "ACTIVE",
        store: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
      },
      include: {
        store: {
          include: {
            vendor: {
              select: {
                id: true,
                ownerId: true,
                organizationId: true,
                businessType: true,
                status: true,
              },
            },
          },
        },
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found.", code: "PRODUCT_NOT_FOUND" },
        { status: 404 },
      );
    }

    const verification = await getPublicSellerVerification([{
      id: product.store.vendor.id,
      ownerId: product.store.vendor.ownerId,
      organizationId: product.store.vendor.organizationId,
      businessType: product.store.vendor.businessType,
      status: product.store.vendor.status,
    }]);

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        attributes: product.attributes,
        sku: product.sku,
        image: product.image,
        price: Number(product.price),
        currency: product.currency,
        stock: product.stock,
        status: product.status,
        store: {
          id: product.store.id,
          name: product.store.name,
          rating: Number(product.store.rating),
          verified: verification.get(product.store.vendor.id) ?? false,
        },
        category: product.category
          ? { id: product.category.id, name: product.category.name }
          : null,
      },
    }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("[MARKETPLACE_PRODUCT_ERROR]", error);
    return NextResponse.json(
      { message: "Unable to load marketplace product.", code: "MARKETPLACE_PRODUCT_FAILED" },
      { status: 500 },
    );
  }
}
