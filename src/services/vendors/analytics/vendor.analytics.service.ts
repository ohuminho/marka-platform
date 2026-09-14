import {
  prisma,
} from "@/database/client/prisma";

import {
  VendorDashboardMetrics,
} from "./vendor.metrics.types";

export class VendorAnalyticsService {
  async getDashboardMetrics(
    vendorId: string
  ): Promise<VendorDashboardMetrics> {
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

    const totalProducts =
      products.length;

    const totalUnits =
      products.reduce(
        (total, product) =>
          total + product.stock,
        0
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

    const lowStockProducts =
      products.filter(
        (product) =>
          product.stock <= 5
      ).length;

    const orders =
      await prisma.order.findMany({
        where: {
          items: {
            some: {
              productId: {
                in: products.map(
                  (product) =>
                    product.id
                ),
              },
            },
          },
        },
      });

    const completedOrders =
      orders.filter(
        (order) =>
          order.status === "DELIVERED"
      ).length;

    const cancelledOrders =
      orders.filter(
        (order) =>
          order.status === "CANCELLED"
      ).length;

    const revenue =
      orders.reduce(
        (total, order) =>
          total.add(order.total),
        products[0]?.price
          .constructor(0) as typeof products[number]["price"]
      );

    const averageOrderValue =
      orders.length
        ? revenue.div(orders.length)
        : products[0]?.price
            .constructor(0) as typeof products[number]["price"];

    const customers =
      new Set(
        orders.map(
          (order) =>
            order.userId
        )
      ).size;

    const rating =
      vendor.store?.rating
        ? vendor.store.rating.toNumber()
        : 0;

    return {
      revenue: {
        current:
          revenue.toNumber(),
        previous: 0,
        growthPercentage: 0,
        currency: "AOA",
      },

      sales: {
        totalOrders:
          orders.length,
        completedOrders,
        cancelledOrders,
        averageOrderValue:
          averageOrderValue.toNumber(),
      },

      inventory: {
        totalProducts,
        totalUnits,
        inventoryValue:
          inventoryValue.toNumber(),
        lowStockProducts,
      },

      store: {
        rating,
        views: 0,
        customers,
        verified:
          vendor.verified,
      },

      generatedAt:
        new Date(),
    };
  }
}
