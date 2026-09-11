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



export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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



    tokenService.verify(
      token
    );



    const {
      id,
    } = await params;



    const orderService =
      new OrderService();



    const order =
      await orderService.getOrderById(
        id
      );



    return NextResponse.json(
      order
    );



  } catch {


    return NextResponse.json(

      {
        message: "Unable to load order",
      },

      {
        status: 401,
      }

    );

  }


}
