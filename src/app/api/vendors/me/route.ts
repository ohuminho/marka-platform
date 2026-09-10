import { cookies } from "next/headers";

import { prisma } from "@/database/client/prisma";

import { TokenService } from "@/core/authentication/token.service";


export async function GET() {


  const cookieStore =
    await cookies();


  const token =
    cookieStore.get(
      "marka_session"
    )?.value;



  if (!token) {

    return Response.json(
      {
        vendor: null,
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



    const vendor =
      await prisma.vendor.findFirst({

        where: {
          ownerId:
            payload.userId,
        },

        include: {

          store: true,

        },

      });



    if (!vendor) {

      return Response.json(
        {
          vendor: null,
        },
        {
          status: 404,
        }
      );

    }



    return Response.json({
      vendor,
    });



  } catch {


    return Response.json(
      {
        vendor: null,
      },
      {
        status: 401,
      }
    );


  }

}
