import {
  prisma,
} from "@/database/client/prisma";

import {
  Prisma,
} from "@prisma/client";



interface MarketplaceQuery {

  search?: string;

  categoryId?: string;

  verifiedOnly?: boolean;

  sortBy?: string;

}



export class MarketplaceService {



  async getProducts(

    query?: MarketplaceQuery

  ) {



    let orderBy:
      Prisma.ProductOrderByWithRelationInput =
    {

      createdAt: "desc",

    };



    if (
      query?.sortBy === "price_asc"
    ) {


      orderBy = {

        price: "asc",

      };


    }



    if (
      query?.sortBy === "price_desc"
    ) {


      orderBy = {

        price: "desc",

      };


    }



    const products = await prisma.product.findMany({

      where: {


        name: query?.search

          ? {

              contains: query.search,

              mode: "insensitive",

            }

          : undefined,



        categoryId:
          query?.categoryId || undefined,



        stock: { gt: 0 },

        store: {
          status: "ACTIVE",
          vendor: {
            status: "ACTIVE",
            ...(query?.verifiedOnly ? { verified: true } : {}),
          },
        },

        status: "ACTIVE",


      },


      include: {

        store: {

          include: {

            vendor: { select: { id: true, ownerId: true, organizationId: true, businessType: true, status: true } },

          },

        },


        category: true,


      },


      orderBy,


    });


    const verification = await getPublicSellerVerification(products.map((product) => ({\n      id: product.store.vendor.id,\n      ownerId: product.store.vendor.ownerId,\n      organizationId: product.store.vendor.organizationId,\n      businessType: product.store.vendor.businessType,\n      status: product.store.vendor.status,\n    })));\n\n    const mapped = products.map((product) => ({
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
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : null,
    }));


  }


}
