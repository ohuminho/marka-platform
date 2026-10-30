import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { getAuthorizedCommunicationThread } from "@/core/communications/communication-context.service";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ callId: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para gerir a chamada." }, { status: 401 });
    const { callId } = await context.params;
    const input = await request.json().catch(() => null) as { action?: unknown } | null;
    const action = input?.action;
    if (!["ACCEPT", "REJECT", "END", "MISSED"].includes(String(action))) {
      return NextResponse.json({ message: "Acção de chamada inválida." }, { status: 400 });
    }

    const call = await prisma.communicationCallSession.findFirst({
      where: { id: callId, OR: [{ callerId: actor.id }, { calleeId: actor.id }] },
      select: { id: true, callerId: true, calleeId: true, threadId: true, status: true, expiresAt: true },
    });
    if (!call) return NextResponse.json({ message: "Chamada não encontrada." }, { status: 404 });
    if (call.threadId) await getAuthorizedCommunicationThread(call.threadId, actor.id);
    const now = new Date();
    if (call.status !== "RINGING" && call.status !== "ACCEPTED") {
      return NextResponse.json({ message: "Esta chamada já não está activa." }, { status: 409 });
    }
    if (call.status === "RINGING" && call.expiresAt <= now && action !== "END") {
      await prisma.communicationCallSession.updateMany({ where: { id: callId, status: "RINGING" }, data: { status: "MISSED", endedAt: now } });
      return NextResponse.json({ message: "A chamada expirou." }, { status: 410 });
    }
    if ((action === "ACCEPT" || action === "REJECT" || action === "MISSED") && actor.id !== call.calleeId) {
      return NextResponse.json({ message: "Só o destinatário pode responder à chamada." }, { status: 403 });
    }
    if (action === "ACCEPT") {
      const result = await prisma.communicationCallSession.updateMany({
        where: { id: callId, calleeId: actor.id, status: "RINGING", expiresAt: { gt: now } },
        data: { status: "ACCEPTED", acceptedAt: now, expiresAt: new Date(now.getTime() + 3 * 60 * 60_000) },
      });
      if (!result.count) return NextResponse.json({ message: "A chamada já foi respondida ou expirou." }, { status: 409 });
    } else {
      const status = action === "REJECT" ? "REJECTED" : action === "MISSED" ? "MISSED" : "ENDED";
      const result = await prisma.communicationCallSession.updateMany({
        where: { id: callId, status: { in: ["RINGING", "ACCEPTED"] } },
        data: { status, endedAt: now },
      });
      if (!result.count) return NextResponse.json({ message: "A chamada já foi encerrada." }, { status: 409 });
    }
    return NextResponse.json({ success: true, action }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_CALL_LIFECYCLE]", error);
    return NextResponse.json({ message: "Não foi possível actualizar a chamada." }, { status: 500 });
  }
}
