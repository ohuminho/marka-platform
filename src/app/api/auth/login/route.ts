import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { reserveApiRequest } from "@/core/security/api-rate-limit";

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
  // Vercel sanitizes these platform headers. Prefer its dedicated header,
  // then use the equivalent forwarded headers as compatible fallbacks.
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  ];

  for (const candidate of candidates) {
    const ip = candidate?.split(",")[0]?.trim();
    if (ip && isIP(ip)) return ip;
  }

  return undefined;
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

    const clientIp = getClientIp(request);

    // An email is not an IP identity. If the trusted platform IP is absent
    // (for example in local development), do not misclassify this quota.
    // Non-privileged accounts remain protected by AUTH_LOGIN_ACCOUNT below.
    if (clientIp) {
      const ipQuota = await reserveApiRequest({
        scope: "AUTH_LOGIN_IP",
        anonymousIdentity: clientIp,
        windows: [
          { limit: 10, windowMs: 60_000 },
          { limit: 40, windowMs: 60 * 60 * 1000 },
        ],
      });
      if (!ipQuota.allowed) {
        return NextResponse.json(
          { message: "Demasiadas tentativas. Aguarda antes de tentar novamente.", code: "LOGIN_RATE_LIMITED", retryAfterSeconds: ipQuota.retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(ipQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
        );
      }
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

    // Founder and global administrators must not be locked out by the
    // per-account quota. The IP quota above remains active as an abuse guard.
    const isPrivilegedAccount =
      user.isFounder ||
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN";

    if (!isPrivilegedAccount) {
      const accountQuota = await reserveApiRequest({
        scope: "AUTH_LOGIN_ACCOUNT",
        anonymousIdentity: `email:${email}`,
        windows: [
          { limit: 6, windowMs: 15 * 60 * 1000 },
          { limit: 15, windowMs: 24 * 60 * 60 * 1000 },
        ],
      });
      if (!accountQuota.allowed) {
        return NextResponse.json(
          { message: "Demasiadas tentativas para esta conta. Aguarda antes de tentar novamente.", code: "LOGIN_ACCOUNT_RATE_LIMITED", retryAfterSeconds: accountQuota.retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(accountQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
        );
      }
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
