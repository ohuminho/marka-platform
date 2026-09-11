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
  OrderService,
} from "@/services/orders/order.service";



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



    const orderService =
      new OrderService();



    const orders =
      await orderService.getUserOrders(
        payload.userId
      );



    return NextResponse.json(
      orders
    );



  } catch {


    return NextResponse.json(

      {
        message: "Unable to load orders",
      },

      {
        status: 401,
      }

    );

  }


}
