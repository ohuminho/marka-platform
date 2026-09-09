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



  async getProductsByStore(
    storeId: string
  ) {

    return prisma.product.findMany({
      where: {
        storeId,
      },

      include: {
        category: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  }



  async getProduct(
    productId: string
  ) {

    return prisma.product.findUnique({
      where: {
        id: productId,
      },

      include: {
        category: true,
        store: true,
      },
    });

  }



  async updateProduct(
    productId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      image?: string;
    }
  ) {

    return prisma.product.update({

      where: {
        id: productId,
      },

      data,

    });

  }



  async updateStock(
    productId: string,
    quantity: number
  ) {

    return prisma.product.update({

      where: {
        id: productId,
      },

      data: {
        stock: {
          increment: quantity,
        },
      },

    });

  }



  async disableProduct(
    productId: string
  ) {

    return prisma.product.update({

      where: {
        id: productId,
      },

      data: {
        status: "DISABLED",
      },

    });

  }


}
