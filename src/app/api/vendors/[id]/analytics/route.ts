import { cookies } from "next/headers";

import { prisma } from "@/database/client/prisma";

import {
  TokenService,
} from "@/core/authentication/token.service";

import {
  VendorAnalyticsService,
} from "@/services/vendors/analytics/vendor.analytics.service";


const analyticsService =
  new VendorAnalyticsService();



export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {


  const {
    id,
  } =
    await context.params;



  const cookieStore =
    await cookies();



  const token =
    cookieStore.get(
      "marka_session"
    )?.value;



  if (!token) {

    return Response.json(
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



    const vendor =
      await prisma.vendor.findUnique({

        where: {
          id,
        },

      });



    if (!vendor) {

      return Response.json(
        {
          message: "Vendor not found",
        },
        {
          status: 404,
        }
      );

    }



    if (
      vendor.ownerId !==
      payload.userId
    ) {

      return Response.json(
        {
          message: "Forbidden",
        },
        {
          status: 403,
        }
      );

    }



    const metrics =
      await analyticsService.getDashboardMetrics(
        id
      );



    return Response.json(
      metrics
    );



  } catch {


    return Response.json(
      {
        message: "Invalid session",
      },
      {
        status: 401,
      }
    );


  }

}
