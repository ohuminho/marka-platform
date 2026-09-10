import {
  NextResponse,
} from "next/server";


import {
  cookies,
} from "next/headers";


import {
  TokenService,
} from "@/core/authentication/token.service";


import {
  CartService,
} from "@/services/cart/cart.service";



async function getUserId() {


  const cookieStore =
    await cookies();



  const token =
    cookieStore.get(
      "marka_session"
    )?.value;



  if (!token) {

    throw new Error(
      "Unauthorized"
    );

  }



  const tokenService =
    new TokenService();



  const payload =
    tokenService.verify(
      token
    ) as {

      userId: string;

    };



  return payload.userId;


}





export async function PATCH(

  request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  }

) {


  try {


    await getUserId();



    const {
      id,
    } =
      await context.params;



    const body =
      await request.json();



    const quantity =
      Number(
        body.quantity
      );



    if (
      !quantity ||
      quantity < 1
    ) {


      return NextResponse.json(

        {
          message:
            "Invalid quantity",
        },

        {
          status: 400,
        }

      );


    }



    const cartService =
      new CartService();



    const item =
      await cartService.updateItem(

        id,

        quantity

      );



    return NextResponse.json(
      item
    );



  } catch {


    return NextResponse.json(

      {
        message:
          "Unauthorized",
      },

      {
        status: 401,
      }

    );

  }


}





export async function DELETE(

  request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  }

) {


  try {


    await getUserId();



    const {
      id,
    } =
      await context.params;



    const cartService =
      new CartService();



    const item =
      await cartService.removeItem(
        id
      );



    return NextResponse.json(
      item
    );



  } catch {


    return NextResponse.json(

      {
        message:
          "Unauthorized",
      },

      {
        status: 401,
      }

    );

  }


}
