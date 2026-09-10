import {
  NextResponse,
} from "next/server";

import type {
  NextRequest,
} from "next/server";

import {
  EdgeTokenService,
} from "@/core/authentication/edge-token.service";



export async function middleware(
  request: NextRequest
) {


  const token =
    request.cookies.get(
      "marka_session"
    )?.value;



  const pathname =
    request.nextUrl.pathname;



  const isPrivateRoute =
    pathname.startsWith(
      "/app"
    );



  if (
    isPrivateRoute &&
    !token
  ) {

    return NextResponse.redirect(
      new URL(
        "/auth/login",
        request.url
      )
    );

  }



  if (
    isPrivateRoute &&
    token
  ) {

    try {


      const service =
        new EdgeTokenService();



      await service.verify(
        token
      );



    } catch {


      const response =
        NextResponse.redirect(
          new URL(
            "/auth/login",
            request.url
          )
        );


      response.cookies.delete(
        "marka_session"
      );


      return response;

    }

  }



  return NextResponse.next();

}



export const config = {

  matcher: [
    "/app/:path*",
  ],

};
