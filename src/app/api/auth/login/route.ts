import { prisma } from "@/database/client/prisma";
import { PasswordService } from "@/core/authentication/password.service";
import { TokenService } from "@/core/authentication/token.service";

export async function POST(
  request: Request
) {

  const body = await request.json();

  const user =
    await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });


  if (!user) {
    return Response.json(
      {
        message: "Invalid credentials",
      },
      {
        status: 401,
      }
    );
  }


  const passwordService =
    new PasswordService();


  const valid =
    await passwordService.compare(
      body.password,
      user.password
    );


  if (!valid) {
    return Response.json(
      {
        message: "Invalid credentials",
      },
      {
        status: 401,
      }
    );
  }


  const tokenService =
    new TokenService();


  const token =
    tokenService.generate({
      userId: user.id,
      role: user.role,
    });


  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt:
        new Date(
          Date.now() +
          24 * 60 * 60 * 1000
        ),
    },
  });


  return Response.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
}
