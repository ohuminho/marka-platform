import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import {
  SessionService,
} from "@/core/auth/sessions/session.service";

export async function POST() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        AuthConfig.cookies.name
      )?.value;

    if (token) {
      const sessionService =
        new SessionService();

      await sessionService.revoke(
        token
      );
    }

    const response =
      NextResponse.json({
        message:
          "Signed out successfully.",
      });

    response.cookies.set({
      name:
        AuthConfig.cookies.name,
      value: "",
      httpOnly:
        AuthConfig.cookies.httpOnly,
      secure:
        AuthConfig.cookies.secure,
      sameSite:
        AuthConfig.cookies.sameSite,
      path:
        AuthConfig.cookies.path,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      "[AUTH_LOGOUT_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to sign out at this time.",
      },
      { status: 500 }
    );
  }
}
