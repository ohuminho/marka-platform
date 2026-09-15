import { prisma } from "@/database/client/prisma";

export interface AuthorizationContext {
  userId: string;
  organizationId?: string;
}

export class AuthorizationService {
  async hasPermission(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        ...(organizationId
          ? {
              organizationId,
            }
          : {}),
        organization: {
          status: "ACTIVE",
        },
      },
      select: {
        organizationId: true,
      },
    });

    if (memberships.length === 0) {
      return false;
    }

    const organizationIds = memberships.map(
      (membership) => membership.organizationId
    );

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
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

    return userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.action === permission
      )
    );
  }

  async getRoles(
    userId: string,
    organizationId?: string
  ): Promise<string[]> {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        ...(organizationId
          ? {
              organizationId,
            }
          : {}),
        organization: {
          status: "ACTIVE",
        },
      },
      select: {
        organizationId: true,
      },
    });

    if (memberships.length === 0) {
      return [];
    }

    const organizationIds = memberships.map(
      (membership) => membership.organizationId
    );

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        organizationId: {
          in: organizationIds,
        },
        role: {
          status: "ACTIVE",
        },
      },
      include: {
        role: true,
      },
    });

    return userRoles.map((userRole) => userRole.role.name);
  }
}
