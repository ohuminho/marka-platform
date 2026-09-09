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
      vendor.store?.products || [];


    const activeProducts =
      products.filter(
        product =>
          product.status === "ACTIVE"
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


    return {

      store: {
        name:
          vendor.store?.name,

        rating:
          vendor.store?.rating,

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

        units:
          products.reduce(
            (total, product) =>
              total +
              product.stock,
            0
          ),

        estimatedValue:
          inventoryValue,

      },


      status:
        vendor.status,

    };

  }


}
