import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    AuthConfig.cookies.name
  )?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const sessionService = new SessionService();

  const session =
    await sessionService.validate(token);

  if (!session) {
    redirect("/auth/login");
  }

  return children;
}
