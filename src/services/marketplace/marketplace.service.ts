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



    return prisma.product.findMany({

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


  }


}
