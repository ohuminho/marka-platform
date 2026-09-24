import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";

const PUBLIC_APP_PATHS = [
  "/app/health",
];

export function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  if (
    PUBLIC_APP_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    )
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      AuthConfig.cookies.name
    )?.value;

  if (!token) {
    const loginUrl =
      new URL(
        AuthConfig.routes.login,
        request.url
      );

    loginUrl.searchParams.set(
      "returnTo",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
  ],
};
