import { NextResponse } from "next/server";
import { UserService } from "@/services/users/user.service";

export async function POST(request: Request) {
  const body = await request.json();

  const service = new UserService();

  const user = await service.createUser(
    body.name,
    body.email,
    body.role
  );

  return NextResponse.json(user);
}
