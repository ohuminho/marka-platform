import { NextResponse } from "next/server";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { getTrustedClientIp } from "@/core/security/client-ip";

import { AuthConfig } from "@/core/authentication/auth.config";
import { isLoginRequestBody } from "@/core/authentication/login-input";
import { isPrivilegedLoginAccount } from "@/core/authentication/login-policy";
import { passwordService } from "@/core/authentication/password.service";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

const IP_WINDOWS = [
  { limit: 10, windowMs: 60_000 },
  { limit: 40, windowMs: 60 * 60 * 1000 },
];
const ACCOUNT_WINDOWS = [
  { limit: 6, windowMs: 15 * 60 * 1000 },
  { limit: 15, windowMs: 24 * 60 * 60 * 1000 },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// One bcrypt hash per server instance; reused for unknown-account comparisons.
const DUMMY_PASSWORD_HASH = passwordService.hash(
  "marka-auth-dummy-password-comparison",
);

function rateLimited(message: string, code: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { message, code, retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isLoginRequestBody(body)) {
      return NextResponse.json(
        { message: "Invalid request body.", code: "INVALID_REQUEST_BODY" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const email =
      typeof body.email === "string" && body.email.length <= 320
        ? normalizeEmail(body.email)
        : "";
    const password =
      typeof body.password === "string" &&
      body.password.length <= AuthConfig.password.maximumLength
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Invalid credentials.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Resolve the account before applying quotas so founder/global-admin
    // accounts are not constrained by ordinary account or IP rate limits.
    const user = await prisma.user.findUnique({
      where: { emailNormalized: email },
    });

    const isPrivilegedAccount = isPrivilegedLoginAccount(user);
    const clientIp = getTrustedClientIp(request);

    if (!isPrivilegedAccount) {
      if (clientIp) {
        const ipQuota = await reserveApiRequest({
          scope: "AUTH_LOGIN_IP",
          anonymousIdentity: clientIp,
          windows: IP_WINDOWS,
          record: false,
        });
        if (!ipQuota.allowed) {
          return rateLimited(
            "Demasiadas tentativas. Aguarda antes de tentar novamente.",
            "LOGIN_RATE_LIMITED",
            ipQuota.retryAfterSeconds,
          );
        }
      }

      const accountQuota = await reserveApiRequest({
        scope: "AUTH_LOGIN_ACCOUNT",
        anonymousIdentity: `email:${email}`,
        windows: ACCOUNT_WINDOWS,
        record: false,
      });
      if (!accountQuota.allowed) {
        return rateLimited(
          "Demasiadas tentativas para esta conta. Aguarda antes de tentar novamente.",
          "LOGIN_ACCOUNT_RATE_LIMITED",
          accountQuota.retryAfterSeconds,
        );
      }
    }

    // Unknown accounts still execute a real bcrypt comparison to reduce
    // account-enumeration timing differences.
    const passwordMatches = user
      ? await passwordService.compare(password, user.password)
      : await passwordService.compare(password, await DUMMY_PASSWORD_HASH);
    // A dummy-hash match must never authenticate an unknown account.
    // Keep the null check in the branch condition so TypeScript narrows `user`
    // before the authenticated-account path below.
    if (!user || !passwordMatches) {
      // Only failed credentials consume login quota. Successful logins no
      // longer lock out legitimate users who sign in repeatedly.
      if (!isPrivilegedAccount) {
        if (clientIp) {
          const ipFailure = await reserveApiRequest({
            scope: "AUTH_LOGIN_IP",
            anonymousIdentity: clientIp,
            windows: IP_WINDOWS,
          });
          if (!ipFailure.allowed) {
            return rateLimited(
              "Demasiadas tentativas. Aguarda antes de tentar novamente.",
              "LOGIN_RATE_LIMITED",
              ipFailure.retryAfterSeconds,
            );
          }
        }

        const accountFailure = await reserveApiRequest({
          scope: "AUTH_LOGIN_ACCOUNT",
          anonymousIdentity: `email:${email}`,
          windows: ACCOUNT_WINDOWS,
        });
        if (!accountFailure.allowed) {
          return rateLimited(
            "Demasiadas tentativas para esta conta. Aguarda antes de tentar novamente.",
            "LOGIN_ACCOUNT_RATE_LIMITED",
            accountFailure.retryAfterSeconds,
          );
        }
      }

      return NextResponse.json(
        {
          message: "Invalid credentials.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (user.status === "PENDING_VERIFICATION") {
      return NextResponse.json(
        {
          message: "Please verify your email address before signing in.",
          code: "EMAIL_VERIFICATION_REQUIRED",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "LOCKED" ||
      user.status === "DELETED"
    ) {
      return NextResponse.json(
        {
          message: "This account is not available.",
          code: "USER_ACCOUNT_UNAVAILABLE",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await new SessionService().create({
      userId: user.id,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
        },
        session: { expiresAt: session.expiresAt },
      },
      { headers: { "Cache-Control": "no-store, private" } },
    );

    response.cookies.set({
      name: AuthConfig.cookies.name,
      value: session.token,
      httpOnly: AuthConfig.cookies.httpOnly,
      secure: AuthConfig.cookies.secure,
      sameSite: AuthConfig.cookies.sameSite,
      path: AuthConfig.cookies.path,
      maxAge: AuthConfig.session.durationHours * 60 * 60,
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);
    return NextResponse.json(
      { message: "Unable to authenticate at this time." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
