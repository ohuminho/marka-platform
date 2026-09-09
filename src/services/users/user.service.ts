import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";

export class UserService {

  async createUser(data: {
    name: string;
    email: string;
    password: string;
  }) {

    const passwordService =
      new PasswordService();

    const passwordHash =
      await passwordService.hash(
        data.password
      );

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        role: "CUSTOMER",
      },
    });
  }


  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

}
