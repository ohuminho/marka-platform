import { prisma } from "@/database/client/prisma";

export function getLegacyPrivilegedRoleName(
  role: string | null | undefined,
): "ADMIN" | "SUPER_ADMIN" | null {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? role : null;
}

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

    const [userRoles, user] = await Promise.all([
      prisma.userRole.findMany({
        where: {
          userId: context.userId,
          organizationId: { in: organizationIds },
          role: { status: "ACTIVE" },
        },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { role: true },
      }),
    ]);

    // Older privileged accounts were provisioned through User.role before
    // UserRole became the canonical assignment table. Scope this fallback
    // strictly to the platform organization.
    const legacyRoleName = getLegacyPrivilegedRoleName(user?.role);
    const legacyRoles = legacyRoleName
      ? await prisma.role.findMany({
          where: {
            organizationId: { in: organizationIds },
            organization: { type: "PLATFORM" },
            name: legacyRoleName,
            status: "ACTIVE",
          },
          include: {
            permissions: { include: { permission: true } },
          },
        })
      : [];

    const assignedRoleIds = new Set(userRoles.map((userRole) => userRole.roleId));
    const effectiveRoles = [
      ...userRoles.map((userRole) => userRole.role),
      ...legacyRoles.filter((role) => !assignedRoleIds.has(role.id)),
    ];

    const roles = [...new Set(effectiveRoles.map((role) => role.name))];
    const permissions = [
      ...new Set(
        effectiveRoles.flatMap((role) =>
          role.permissions.map((rolePermission) => rolePermission.permission.action),
        ),
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
