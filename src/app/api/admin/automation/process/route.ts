import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { AutomationService } from "@/services/automation/automation.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true, role: true, isFounder: true },
  });
  if (!user || user.status !== "ACTIVE" || !(user.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role))) {
    return { error: NextResponse.json({ message: "Acesso administrativo necessário." }, { status: 403 }) };
  }
  return { user };
}

const inputSchema = z.object({ limit: z.number().int().min(1).max(50).default(20) }).strict();

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const input = inputSchema.parse(await request.json().catch(() => ({})));
    const result = await new AutomationService().processPending(input.limit);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }
    console.error("[MARKA_AUTOMATION_PROCESS]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível processar os eventos." }, { status: 503 });
  }
}
