import { cookies } from "next/headers";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

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

      await sessionService.revoke(token);
    }

    const response =
      Response.json({
        message:
          "Signed out successfully.",
      });

    response.headers.append(
      "Set-Cookie",
      `${AuthConfig.cookies.name}=; Path=${AuthConfig.cookies.path}; Max-Age=0; HttpOnly; SameSite=${AuthConfig.cookies.sameSite}${AuthConfig.cookies.secure ? "; Secure" : ""}`
    );

    return response;
  } catch (error) {
    console.error(
      "[AUTH_LOGOUT_ERROR]",
      error
    );

    return Response.json(
      {
        message:
          "Unable to sign out at this time.",
      },
      {
        status: 500,
      }
    );
  }
}
