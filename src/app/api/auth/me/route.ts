import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { prisma } from "@/database/client/prisma";
import { AuthConfig } from "@/core/authentication/auth.config";
import {
  SessionService,
} from "@/core/auth/sessions/session.service";
import {
  authorizationService,
} from "@/core/authorization/authorization.service";

export async function GET(
  request: NextRequest
) {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        AuthConfig.cookies.name
      )?.value;

    if (!token) {
      return Response.json(
        { user: null },
        { status: 401 }
      );
    }

    const sessionService =
      new SessionService();

    const session =
      await sessionService.validate(
        token
      );

    if (!session) {
      return Response.json(
        { user: null },
        { status: 401 }
      );
    }

    const requestedOrganizationId =
      request.nextUrl.searchParams.get(
        "organizationId"
      ) ?? undefined;

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

          memberships: {
            where: {
              status: "ACTIVE",
              organization: {
                status: "ACTIVE",
              },
            },

            select: {
              organizationId: true,

              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

    if (!user) {
      await sessionService.revoke(
        token
      );

      return Response.json(
        { user: null },
        { status: 401 }
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "LOCKED" ||
      user.status === "DELETED" ||
      user.status ===
        "PENDING_VERIFICATION"
    ) {
      await sessionService.revoke(
        token
      );

      return Response.json(
        { user: null },
        { status: 401 }
      );
    }

    const membershipOrganizationIds =
      user.memberships.map(
        (membership) =>
          membership.organizationId
      );

    const organizationId =
      requestedOrganizationId &&
      membershipOrganizationIds.includes(
        requestedOrganizationId
      )
        ? requestedOrganizationId
        : user.memberships[0]
            ?.organizationId;

    const authorization =
      await authorizationService.authorize(
        {
          userId: user.id,
          organizationId,
        }
      );

    if (
      !authorization.allowed ||
      !authorization.organizationId
    ) {
      return Response.json(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerifiedAt:
              user.emailVerifiedAt,
            profile: user.profile,
          },

          organizations:
            user.memberships.map(
              (membership) =>
                membership.organization
            ),

          authorization: {
            organizationId: undefined,
            roles: [],
            permissions: [],
          },
        }
      );
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerifiedAt:
          user.emailVerifiedAt,
        profile: user.profile,
      },

      session: {
        id: session.id,
        expiresAt:
          session.expiresAt,
        createdAt:
          session.createdAt,
        lastSeenAt:
          session.lastSeenAt,
      },

      organizations:
        user.memberships.map(
          (membership) =>
            membership.organization
        ),

      authorization: {
        organizationId:
          authorization.organizationId,
        roles:
          authorization.roles,
        permissions:
          authorization.permissions,
      },
    });
  } catch (error) {
    console.error(
      "[AUTH_ME_ERROR]",
      error
    );

    return Response.json(
      { user: null },
      { status: 401 }
    );
  }
}
