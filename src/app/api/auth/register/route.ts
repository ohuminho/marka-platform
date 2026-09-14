import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";
import { AuthConfig } from "@/core/authentication/auth.config";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashVerificationToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!name || name.length < 2) {
      return Response.json(
        {
          message: "A valid name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email ||
      !email.includes("@") ||
      email.length > 254
    ) {
      return Response.json(
        {
          message: "A valid email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length <
      AuthConfig.password.minimumLength
    ) {
      return Response.json(
        {
          message: `Password must contain at least ${AuthConfig.password.minimumLength} characters.`,
        },
        {
          status: 400,
        }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          emailNormalized: email,
        },
        select: {
          id: true,
        },
      });

    if (existingUser) {
      return Response.json(
        {
          message: "Unable to create this account.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordService =
      new PasswordService();

    const passwordHash =
      await passwordService.hash(password);

    const verificationToken =
      randomBytes(48).toString("base64url");

    const tokenHash =
      hashVerificationToken(
        verificationToken
      );

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const user = await prisma.$transaction(
      async (tx) => {
        const createdUser =
          await tx.user.create({
            data: {
              name,
              email,
              emailNormalized: email,
              password: passwordHash,
              role: "CUSTOMER",
              status: "PENDING_VERIFICATION",

              profile: {
                create: {
                  displayName: name,
                },
              },

              emailVerificationTokens: {
                create: {
                  tokenHash,
                  expiresAt,
                },
              },
            },
          });

        return createdUser;
      }
    );

    return Response.json(
      {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "[AUTH_REGISTER_ERROR]",
      error
    );

    return Response.json(
      {
        message:
          "Unable to create the account.",
      },
      {
        status: 500,
      }
    );
  }
}
