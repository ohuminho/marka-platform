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



        store: query?.verifiedOnly

          ? {

              vendor: {

                verified: true,

              },

            }

          : undefined,



        status: "ACTIVE",


      },


      include: {

        store: {

          include: {

            vendor: true,

          },

        },


        category: true,


      },


      orderBy,


    });


    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
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
        verified: product.store.vendor.verified,
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
