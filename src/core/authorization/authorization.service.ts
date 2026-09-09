import { prisma } from "@/database/client/prisma";

export class AuthorizationService {
  async userHasPermission(
    userId: string,
    permission: string
  ) {
    const result = await prisma.userRole.findMany({
      where: {
        userId,
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

    return result.some((userRole) =>
      userRole.role.permissions.some(
        (item) =>
          item.permission.action === permission
      )
    );
  }
}
