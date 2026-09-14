import { cookies } from "next/headers";

import { prisma } from "@/database/client/prisma";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        AuthConfig.cookies.name
      )?.value;

    if (!token) {
      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    const sessionService =
      new SessionService();

    const session =
      await sessionService.validate(token);

    if (!session) {
      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          profile: {
            select: {
              displayName: true,
              phone: true,
              avatarUrl: true,
              countryCode: true,
              locale: true,
              timezone: true,
            },
          },
        },
      });

    if (!user) {
      await sessionService.revoke(token);

      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "LOCKED" ||
      user.status === "DELETED"
    ) {
      await sessionService.revoke(token);

      return Response.json(
        {
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    return Response.json({
      user,
    });
  } catch (error) {
    console.error(
      "[AUTH_ME_ERROR]",
      error
    );

    return Response.json(
      {
        user: null,
      },
      {
        status: 401,
      }
    );
  }
}
