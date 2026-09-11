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



    tokenService.verify(
      token
    );



    const body =
      await request.json();



    const {
      paymentId,
    } = body;



    if (!paymentId) {


      return NextResponse.json(

        {
          message: "Payment id is required",
        },

        {
          status: 400,
        }

      );

    }



    const paymentService =
      new PaymentService();



    const result =
      await paymentService.confirmPayment(
        paymentId
      );



    return NextResponse.json(
      result
    );



  } catch {


    return NextResponse.json(

      {
        message: "Payment confirmation failed",
      },

      {
        status: 401,
      }

    );

  }


}
