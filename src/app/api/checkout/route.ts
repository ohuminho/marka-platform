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
  CheckoutService,
} from "@/services/checkout/checkout.service";



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


    const tokenService =
      new TokenService();



    const payload =
      tokenService.verify(
        token
      ) as {

        userId: string;

      };



    const body =
      await request.json();



    const {
      cartId,
    } = body;



    if (!cartId) {


      return NextResponse.json(

        {
          message: "Cart id is required",
        },

        {
          status: 400,
        }

      );

    }



    const checkoutService =
      new CheckoutService();



    const result =
      await checkoutService.checkout(

        payload.userId,

        cartId

      );



    return NextResponse.json(
      result
    );



  } catch {


    return NextResponse.json(

      {
        message: "Checkout failed",
      },

      {
        status: 401,
      }

    );

  }


}
