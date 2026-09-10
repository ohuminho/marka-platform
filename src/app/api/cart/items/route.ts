import {
  NextResponse,
} from "next/server";


import {
  cookies,
} from "next/headers";


import {
  prisma,
} from "@/database/client/prisma";


import {
  TokenService,
} from "@/core/authentication/token.service";


import {
  CartService,
} from "@/services/cart/cart.service";



export async function POST(

  request: Request

) {


  const cookieStore =
    await cookies();



  const token =
    cookieStore.get(
      "marka_session"
    )?.value;



  if (!token) {


    return NextResponse.json(

      {
        message: "Unauthorized",
      },

      {
        status: 401,
      }

    );

  }



  try {


    const payload =
      new TokenService().verify(
        token
      ) as {

        userId: string;

      };



    const body =
      await request.json();



    const productId =
      body.productId;



    const quantity =
      Number(
        body.quantity
      );



    if (
      !productId ||
      !quantity ||
      quantity <= 0
    ) {


      return NextResponse.json(

        {
          message: "Invalid cart item data",
        },

        {
          status: 400,
        }

      );

    }



    const product =
      await prisma.product.findUnique({

        where: {
          id: productId,
        },

      });



    if (!product) {


      return NextResponse.json(

        {
          message: "Product not found",
        },

        {
          status: 404,
        }

      );

    }



    if (
      product.status !== "ACTIVE"
    ) {


      return NextResponse.json(

        {
          message: "Product unavailable",
        },

        {
          status: 400,
        }

      );

    }



    if (
      quantity > product.stock
    ) {


      return NextResponse.json(

        {
          message: "Insufficient stock",
        },

        {
          status: 400,
        }

      );

    }



    const cartService =
      new CartService();



    await cartService.addItem(

      payload.userId,

      productId,

      quantity

    );



    const cart =
      await cartService.getCart(
        payload.userId
      );



    return NextResponse.json(
      cart
    );



  } catch {


    return NextResponse.json(

      {
        message: "Unable to add item",
      },

      {
        status: 500,
      }

    );

  }


}
