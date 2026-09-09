import { UserService } from "@/services/users/user.service";

const userService = new UserService();

export async function POST(
  request: Request
) {
  const body = await request.json();

  const user = await userService.createUser({
    name: body.name,
    email: body.email,
    password: body.password,
  });

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
