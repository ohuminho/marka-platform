import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await new SessionService().refresh(token);
    if (!session) {
      const response = NextResponse.json(
        { message: "Session expired or invalid.", code: "INVALID_SESSION" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set({
        name: AuthConfig.cookies.name,
        value: "",
        httpOnly: AuthConfig.cookies.httpOnly,
        secure: AuthConfig.cookies.secure,
        sameSite: AuthConfig.cookies.sameSite,
        path: AuthConfig.cookies.path,
        maxAge: 0,
      });
      return response;
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    const response = NextResponse.json(
      { session: { id: session.id, expiresAt: session.expiresAt } },
      { headers: { "Cache-Control": "no-store, private" } },
    );

    response.cookies.set({
      name: AuthConfig.cookies.name,
      value: session.token,
      httpOnly: AuthConfig.cookies.httpOnly,
      secure: AuthConfig.cookies.secure,
      sameSite: AuthConfig.cookies.sameSite,
      path: AuthConfig.cookies.path,
      maxAge: remainingSeconds,
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_SESSION_REFRESH_ERROR]", error);
    return NextResponse.json(
      { message: "Unable to refresh the session.", code: "SESSION_REFRESH_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
