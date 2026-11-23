import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function requireAdmin() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, status: true, isFounder: true } });
  if (!admin || admin.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(admin.role.toUpperCase())) return { error: NextResponse.json({ message: "Administrative access required." }, { status: 403 }) };
  return { admin };
}

const schema = z.object({ signalId: z.string().uuid(), action: z.enum(["WARNING", "SUSPEND", "REINSTATE"]), reason: z.string().trim().min(20).max(1000) });

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const input = schema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const signal = await tx.riskSignal.findUnique({ where: { id: input.signalId }, select: { id: true, userId: true, type: true, status: true } });
      if (!signal || !signal.type.startsWith("CONDUCT_") || !signal.userId) return { error: "SIGNAL_NOT_FOUND" as const };
      if (signal.status !== "REVIEWED") return { error: "SIGNAL_NOT_REVIEWED" as const };
      if (signal.userId === auth.admin.id) return { error: "SELF_ACTION_NOT_ALLOWED" as const };
      const target = await tx.user.findUnique({ where: { id: signal.userId }, select: { id: true, role: true, isFounder: true, status: true } });
      if (!target) return { error: "ACCOUNT_NOT_FOUND" as const };
      if (target.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(target.role.toUpperCase())) return { error: "PRIVILEGED_ACCOUNT_PROTECTED" as const };
      let nextStatus = target.status;
      if (input.action === "SUSPEND") {
        if (target.status !== "ACTIVE") return { error: "ACCOUNT_NOT_ACTIVE" as const };
        await tx.user.update({ where: { id: target.id }, data: { status: "SUSPENDED" } });
        await tx.session.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
        nextStatus = "SUSPENDED";
      } else if (input.action === "REINSTATE") {
        if (target.status !== "SUSPENDED") return { error: "ACCOUNT_NOT_SUSPENDED" as const };
        await tx.user.update({ where: { id: target.id }, data: { status: "ACTIVE" } });
        nextStatus = "ACTIVE";
      }
      await tx.securityEvent.create({ data: {
        actorUserId: auth.admin.id,
        type: input.action === "WARNING" ? "TRUST_SANCTION_WARNING" : input.action === "SUSPEND" ? "TRUST_SANCTION_SUSPENDED" : "TRUST_SANCTION_REINSTATED",
        severity: input.action === "SUSPEND" ? "HIGH" : "MEDIUM",
        correlationId: target.id,
        metadata: { action: input.action, targetUserId: target.id, signalId: signal.id, reason: input.reason, previousStatus: target.status, resultingStatus: nextStatus, appliedAt: new Date().toISOString(), expiry: null, reviewRequired: input.action === "SUSPEND" },
      } });
      await tx.auditLog.create({ data: { actorUserId: auth.admin.id, actorType: "USER", action: "TRUST_DISCIPLINARY_ACTION", entityType: "USER", entityId: target.id, metadata: { action: input.action, signalId: signal.id, reason: input.reason, previousStatus: target.status, resultingStatus: nextStatus } } });
      return { success: true as const, action: input.action, accountStatus: nextStatus };
    });
    if ("error" in result) {
      const messages: Record<string, string> = { SIGNAL_NOT_FOUND: "Ocorrência de conduta não encontrada.", SIGNAL_NOT_REVIEWED: "A ocorrência tem de estar em análise antes de uma medida disciplinar.", SELF_ACTION_NOT_ALLOWED: "Não é permitido aplicar uma medida à própria conta.", ACCOUNT_NOT_FOUND: "Conta associada à ocorrência não encontrada.", PRIVILEGED_ACCOUNT_PROTECTED: "Contas de fundador e administração exigem um processo excepcional separado.", ACCOUNT_NOT_ACTIVE: "A conta não está activa para receber uma suspensão.", ACCOUNT_NOT_SUSPENDED: "A conta não está suspensa e não precisa de reintegração." };
      return NextResponse.json({ message: messages[result.error as keyof typeof messages] ?? "Medida não aplicada." }, { status: 409 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Decisão inválida.", issues: error.issues }, { status: 400 });
    console.error("[MARKA_TRUST_SANCTION_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível aplicar a medida disciplinar." }, { status: 503 });
  }
}
