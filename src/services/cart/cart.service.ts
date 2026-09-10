import {
  prisma,
} from "@/database/client/prisma";



export class CartService {



  async getCart(
    userId: string
  ) {


    let cart =
      await prisma.cart.findFirst({

        where: {
          userId,
        },

        include: {

          items: {

            include: {

              product: {

                include: {

                  store: true,

                },

              },

            },

          },

        },

      });



    if (!cart) {


      cart =
        await prisma.cart.create({

          data: {

            userId,

          },

          include: {

            items: {

              include: {

                product: {

                  include: {

                    store: true,

                  },

                },

              },

            },

          },

        });


    }



    return cart;


  }





  async addItem(

    userId: string,

    productId: string,

    quantity: number

  ) {



    const cart =
      await this.getCart(
        userId
      );



    const existingItem =
      await prisma.cartItem.findFirst({

        where: {

          cartId: cart.id,

          productId,

        },

      });



    if (existingItem) {


      return prisma.cartItem.update({

        where: {

          id: existingItem.id,

        },

        data: {

          quantity: {

            increment: quantity,

          },

        },

      });


    }



    return prisma.cartItem.create({

      data: {

        cartId: cart.id,

        productId,

        quantity,

      },

    });


  }





  async updateItem(

    itemId: string,

    quantity: number

  ) {


    return prisma.cartItem.update({

      where: {

        id: itemId,

      },

      data: {

        quantity,

      },

    });


  }





  async removeItem(

    itemId: string

  ) {


    return prisma.cartItem.delete({

      where: {

        id: itemId,

      },

    });


  }



}
