import { prisma } from "@/database/client/prisma";

export class UserService {
  async createUser(
    name: string,
    email: string,
    role: string
  ) {
    return prisma.user.create({
      data: {
        name,
        email,
        role,
      },
    });
  }
}
