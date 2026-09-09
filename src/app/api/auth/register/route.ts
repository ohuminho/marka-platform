import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";

export async function POST(
  request: Request
) {
  const body = await request.json();

  const passwordService = new PasswordService();

  const passwordHash =
    await passwordService.hash(
      body.password
    );

  const user =
    await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: "CUSTOMER",
        password: passwordHash,
      },
    });

  return Response.json({
    id: user.id,
    email: user.email,
  });
}
