import {
  VendorDashboardMetrics,
} from "./vendor.metrics.types";


export class VendorAnalyticsService {


  async getDashboardMetrics(
    vendorId: string
  ): Promise<VendorDashboardMetrics> {


    /*
      Future data sources:

      Orders
      Products
      Customers
      Payments
      Store activity

      Connected through Prisma
    */


    return {

      revenue: {

        current: 0,

        previous: 0,

        growthPercentage: 0,

        currency: "AOA",

      },


      sales: {

        totalOrders: 0,

        completedOrders: 0,

        cancelledOrders: 0,

        averageOrderValue: 0,

      },


      inventory: {

        totalProducts: 0,

        totalUnits: 0,

        inventoryValue: 0,

        lowStockProducts: 0,

      },


      store: {

        rating: 0,

        views: 0,

        customers: 0,

        verified: false,

      },


      generatedAt: new Date(),

    };

  }

}
