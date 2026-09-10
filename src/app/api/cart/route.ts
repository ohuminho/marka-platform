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



export async function GET() {


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


    const tokenService =
      new TokenService();



    const payload =
      tokenService.verify(
        token
      ) as {

        userId: string;

      };



    const cartService =
      new CartService();



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
        message: "Unauthorized",
      },

      {
        status: 401,
      }

    );

  }


}
