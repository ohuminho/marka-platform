import { prisma } from "@/database/client/prisma";

export interface AuthorizationContext {
  userId: string;
  organizationId?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  organizationId?: string;
  roles: string[];
  permissions: string[];
}

export class AuthorizationService {
  async hasPermission(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    const result =
      await this.authorize({
        userId,
        organizationId,
      });

    return result.allowed &&
      result.permissions.includes(permission);
  }

  async authorize(
    context: AuthorizationContext
  ): Promise<AuthorizationResult> {
    const memberships =
      await prisma.organizationMembership.findMany({
        where: {
          userId: context.userId,
          status: "ACTIVE",
          ...(context.organizationId
            ? {
                organizationId:
                  context.organizationId,
              }
            : {}),
          organization: {
            status: "ACTIVE",
          },
        },
        select: {
          organizationId: true,
          organization: {
            select: {
              id: true,
            },
          },
        },
      });

    if (memberships.length === 0) {
      return {
        allowed: false,
        roles: [],
        permissions: [],
      };
    }

    const organizationIds =
      memberships.map(
        (membership) =>
          membership.organizationId
      );

    const userRoles =
      await prisma.userRole.findMany({
        where: {
          userId: context.userId,
          organizationId: {
            in: organizationIds,
          },
          role: {
            status: "ACTIVE",
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

    const roles = [
      ...new Set(
        userRoles.map(
          (userRole) =>
            userRole.role.name
        )
      ),
    ];

    const permissions = [
      ...new Set(
        userRoles.flatMap(
          (userRole) =>
            userRole.role.permissions.map(
              (rolePermission) =>
                rolePermission.permission
                  .action
            )
        )
      ),
    ];

    return {
      allowed: true,
      organizationId:
        context.organizationId ??
        organizationIds[0],
      roles,
      permissions,
    };
  }

  async getRoles(
    userId: string,
    organizationId?: string
  ): Promise<string[]> {
    const result =
      await this.authorize({
        userId,
        organizationId,
      });

    return result.roles;
  }

  async getPermissions(
    userId: string,
    organizationId?: string
  ): Promise<string[]> {
    const result =
      await this.authorize({
        userId,
        organizationId,
      });

    return result.permissions;
  }
}

export const authorizationService =
  new AuthorizationService();
