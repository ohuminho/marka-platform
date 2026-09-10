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
        user: null,
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
        role: string;
      };



    const session =
      await prisma.session.findUnique({

        where: {
          token,
        },

      });



    if (!session) {

      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );

    }



    const user =
      await prisma.user.findUnique({

        where: {
          id: payload.userId,
        },

      });



    if (!user) {

      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );

    }



    return Response.json({

      user: {

        id: user.id,

        name: user.name,

        role: user.role,

      },

    });



  } catch {


    return Response.json(
      {
        user: null,
      },
      {
        status: 401,
      }
    );


  }

}
