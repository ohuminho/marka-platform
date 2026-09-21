import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(
    AuthConfig.cookies.name
  )?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
