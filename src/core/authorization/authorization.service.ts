import { prisma } from "@/database/client/prisma";

export class AuthorizationService {

  async hasPermission(
    userId: string,
    permission: string
  ) {

    const roles =
      await prisma.userRole.findMany({
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


    return roles.some(
      (userRole) =>
        userRole.role.permissions.some(
          (rolePermission) =>
            rolePermission.permission.action === permission
        )
    );
  }


  async getRoles(
    userId: string
  ) {

    const roles =
      await prisma.userRole.findMany({
        where: {
          userId,
        },
        include: {
          role: true,
        },
      });


    return roles.map(
      item => item.role.name
    );
  }

}
