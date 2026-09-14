import { prisma } from "@/database/client/prisma";

export class VendorIntelligenceService {
  async getStoreOverview(
    vendorId: string
  ) {
    const vendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorId,
        },
        include: {
          store: {
            include: {
              products: true,
            },
          },
        },
      });

    if (!vendor) {
      throw new Error(
        "Vendor not found"
      );
    }

    const products =
      vendor.store?.products ?? [];

    const activeProducts =
      products.filter(
        (product) =>
          product.status === "ACTIVE"
      );

    const inventoryValue =
      products.reduce(
        (total, product) =>
          total.add(
            product.price.mul(
              product.stock
            )
          ),
        products[0]?.price
          .constructor(0) as typeof products[number]["price"]
      );

    const totalUnits =
      products.reduce(
        (total, product) =>
          total + product.stock,
        0
      );

    return {
      store: {
        name:
          vendor.store?.name,
        rating:
          vendor.store?.rating
            ? vendor.store.rating.toNumber()
            : 0,
        verified:
          vendor.verified,
      },

      catalogue: {
        totalProducts:
          products.length,
        activeProducts:
          activeProducts.length,
      },

      inventory: {
        units: totalUnits,
        estimatedValue:
          inventoryValue.toNumber(),
      },

      status:
        vendor.status,
    };
  }
}
