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
  PaymentService,
} from "@/services/payments/payment.service";



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
      orderId,
      amount,
    } = body;



    if (
      !orderId ||
      !amount
    ) {


      return NextResponse.json(

        {
          message: "Order id and amount are required",
        },

        {
          status: 400,
        }

      );

    }



    const paymentService =
      new PaymentService();



    const payment =
      await paymentService.createPayment(

        payload.userId,

        orderId,

        amount

      );



    return NextResponse.json(
      payment
    );



  } catch {


    return NextResponse.json(

      {
        message: "Payment creation failed",
      },

      {
        status: 401,
      }

    );

  }


}
