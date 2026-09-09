import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(
  request: NextRequest
) {

  const token =
    request.cookies.get(
      "marka_session"
    );


  const isPrivateRoute =
    request.nextUrl.pathname.startsWith(
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


  return NextResponse.next();
}


export const config = {
  matcher: [
    "/app/:path*",
  ],
};
