import {
  prisma,
} from "@/database/client/prisma";



interface MarketplaceQuery {

  search?: string;

  categoryId?: string;

  verifiedOnly?: boolean;

}



export class MarketplaceService {



  async getProducts(

    query?: MarketplaceQuery

  ) {


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


      orderBy: {

        createdAt: "desc",

      },


    });


  }


}
