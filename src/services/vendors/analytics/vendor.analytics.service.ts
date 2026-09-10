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
          total +
          (
            product.price *
            product.stock
          ),
        0
      );



    const lowStockProducts =
      products.filter(
        product =>
          product.stock <= 5
      ).length;



    const orders =
      await prisma.order.findMany({

        where: {

          items: {

            some: {

              productId: {

                in: products.map(
                  product => product.id
                ),

              },

            },

          },

        },

      });



    const completedOrders =
      orders.filter(
        order =>
          order.status === "COMPLETED"
      ).length;



    const cancelledOrders =
      orders.filter(
        order =>
          order.status === "CANCELLED"
      ).length;



    const revenue =
      orders.reduce(
        (total, order) =>
          total + order.total,
        0
      );



    const averageOrderValue =
      orders.length
        ? revenue / orders.length
        : 0;



    const customers =
      new Set(
        orders.map(
          order => order.userId
        )
      ).size;



    return {


      revenue: {

        current: revenue,

        previous: 0,

        growthPercentage: 0,

        currency: "AOA",

      },


      sales: {

        totalOrders: orders.length,

        completedOrders,

        cancelledOrders,

        averageOrderValue,

      },


      inventory: {

        totalProducts,

        totalUnits,

        inventoryValue,

        lowStockProducts,

      },


      store: {

        rating:
          vendor.store?.rating ?? 0,

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
