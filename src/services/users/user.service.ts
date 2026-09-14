import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

    const emailNormalized =
      normalizeEmail(data.email);

    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim(),
        emailNormalized,
        password: passwordHash,
        role: "CUSTOMER",
      },
    });
  }

  async findByEmail(email: string) {
    const emailNormalized =
      normalizeEmail(email);

    return prisma.user.findUnique({
      where: {
        emailNormalized,
      },
    });
  }
}
