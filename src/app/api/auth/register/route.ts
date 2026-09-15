import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";
import { VerificationService } from "@/core/auth/verification/verification.service";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(120, "Name is too long."),

  email: z
    .string()
    .trim()
    .email("Invalid email address.")
    .max(320, "Email address is too long."),

  password: z
    .string()
    .min(12, "Password must contain at least 12 characters.")
    .max(128, "Password is too long."),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid registration data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const email = normalizeEmail(parsed.data.email);
    const password = parsed.data.password;

    const existingUser = await prisma.user.findUnique({
      where: {
        emailNormalized: email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "An account with this email already exists.",
          code: "EMAIL_ALREADY_REGISTERED",
        },
        { status: 409 }
      );
    }

    const passwordService = new PasswordService();
    const verificationService =
      new VerificationService();

    const passwordHash =
      await passwordService.hash(password);

    const result = await prisma.$transaction(
      async (tx) => {
        const organization =
          await tx.organization.findUnique({
            where: {
              slug: "marka-platform",
            },
            select: {
              id: true,
              status: true,
            },
          });

        if (
          !organization ||
          organization.status !== "ACTIVE"
        ) {
          throw new Error(
            "MARKA platform organization is not available."
          );
        }

        const customerRole =
          await tx.role.findUnique({
            where: {
              organizationId_name: {
                organizationId: organization.id,
                name: "CUSTOMER",
              },
            },
            select: {
              id: true,
              status: true,
            },
          });

        if (
          !customerRole ||
          customerRole.status !== "ACTIVE"
        ) {
          throw new Error(
            "MARKA CUSTOMER role is not available."
          );
        }

        const user = await tx.user.create({
          data: {
            name,
            email,
            emailNormalized: email,
            password: passwordHash,
            role: "CUSTOMER",
            status: "PENDING_VERIFICATION",
          },
        });

        await tx.profile.create({
          data: {
            userId: user.id,
            displayName: name,
          },
        });

        await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            status: "ACTIVE",
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: customerRole.id,
            organizationId: organization.id,
          },
        });

        const tokenData =
          await verificationService.createToken(
            user.id,
            tx
          );

        return {
          user,
          token: tokenData.token,
          expiresAt: tokenData.expiresAt,
        };
      }
    );

    console.info(
      "[AUTH_VERIFICATION_PENDING]",
      {
        userId: result.user.id,
        email: result.user.email,
        expiresAt:
          result.expiresAt.toISOString(),
      }
    );

    return NextResponse.json(
      {
        id: result.user.id,
        email: result.user.email,
        status: result.user.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[AUTH_REGISTER_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to complete registration.",
      },
      { status: 500 }
    );
  }
}
