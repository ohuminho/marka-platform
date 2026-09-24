import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import {
  passwordService,
} from "@/core/authentication/password.service";
import {
  SessionService,
} from "@/core/auth/sessions/session.service";

import { prisma } from "@/database/client/prisma";

function normalizeEmail(
  email: string
): string {
  return email.trim().toLowerCase();
}

function getClientIp(
  request: Request
): string | undefined {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ??
    request.headers
      .get("x-real-ip")
      ?.trim() ??
    undefined
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          message:
            "Invalid credentials.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          emailNormalized: email,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Invalid credentials.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    const valid =
      await passwordService.compare(
        password,
        user.password
      );

    if (!valid) {
      return NextResponse.json(
        {
          message:
            "Invalid credentials.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    if (
      user.status ===
      "PENDING_VERIFICATION"
    ) {
      return NextResponse.json(
        {
          message:
            "Please verify your email address before signing in.",
          code:
            "EMAIL_VERIFICATION_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "LOCKED" ||
      user.status === "DELETED"
    ) {
      return NextResponse.json(
        {
          message:
            "This account is not available.",
          code:
            "USER_ACCOUNT_UNAVAILABLE",
        },
        { status: 403 }
      );
    }

    const sessionService =
      new SessionService();

    const session =
      await sessionService.create({
        userId: user.id,
        ipAddress:
          getClientIp(request),
        userAgent:
          request.headers.get(
            "user-agent"
          ) ?? undefined,
      });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const response =
      NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerifiedAt:
            user.emailVerifiedAt,
        },
        session: {
          expiresAt:
            session.expiresAt,
        },
      });

    response.cookies.set({
      name:
        AuthConfig.cookies.name,
      value: session.token,
      httpOnly:
        AuthConfig.cookies.httpOnly,
      secure:
        AuthConfig.cookies.secure,
      sameSite:
        AuthConfig.cookies.sameSite,
      path:
        AuthConfig.cookies.path,
      maxAge:
        AuthConfig.session.durationHours *
        60 *
        60,
      expires:
        session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error(
      "[AUTH_LOGIN_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to authenticate at this time.",
      },
      { status: 500 }
    );
  }
}
