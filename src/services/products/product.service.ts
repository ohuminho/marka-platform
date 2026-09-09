import { prisma } from "@/database/client/prisma";


export class ProductService {


  async createProduct(
    storeId: string,
    name: string,
    price: number,
    description?: string
  ) {

    const sku =
      `MARKA-${crypto.randomUUID()
        .split("-")[0]
        .toUpperCase()}`;


    return prisma.product.create({

      data: {

        storeId,

        name,

        price,

        description,

        sku,

        stock: 0,

        status: "ACTIVE",

      },

    });

  }


}
