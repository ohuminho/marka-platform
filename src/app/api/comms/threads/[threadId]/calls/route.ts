import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CommunicationContextError, getAuthorizedCommunicationThread } from "@/core/communications/communication-context.service";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

type Context = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar chamadas." }, { status: 401 });
    const { threadId } = await context.params;
    const thread = await getAuthorizedCommunicationThread(threadId, actor.id);
    const now = new Date();
    await prisma.communicationCallSession.updateMany({
      where: { threadId, status: "RINGING", expiresAt: { lte: now } },
      data: { status: "MISSED", endedAt: now },
    });
    const calls = await prisma.communicationCallSession.findMany({
      where: { threadId, OR: [{ callerId: actor.id }, { calleeId: actor.id }] },
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, callerId: true, calleeId: true, mode: true, status: true, expiresAt: true, acceptedAt: true, endedAt: true, createdAt: true },
    });
    return NextResponse.json({ calls, actorId: actor.id, participants: thread.participants }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_CONTEXT_CALLS_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar as chamadas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para iniciar uma chamada." }, { status: 401 });
    const { threadId } = await context.params;
    const thread = await getAuthorizedCommunicationThread(threadId, actor.id);
    const input = await request.json().catch(() => null) as { mode?: unknown; recipientId?: unknown } | null;
    const mode = input?.mode === "VIDEO" ? "VIDEO" : input?.mode === "AUDIO" || input?.mode == null ? "AUDIO" : null;
    if (!mode) return NextResponse.json({ message: "Tipo de chamada inválido." }, { status: 400 });
    const others = thread.participants.filter((participant) => participant.userId !== actor.id);
    const recipientId = typeof input?.recipientId === "string" ? input.recipientId : others.length === 1 ? others[0]?.userId : "";
    if (!recipientId || !others.some((participant) => participant.userId === recipientId)) {
      return NextResponse.json({ message: "Selecciona um participante autorizado para esta chamada." }, { status: 400 });
    }

    const call = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${threadId}))`;
      const now = new Date();
      await tx.communicationCallSession.updateMany({
        where: { threadId, status: "RINGING", expiresAt: { lte: now } },
        data: { status: "MISSED", endedAt: now },
      });
      const active = await tx.communicationCallSession.findFirst({
        where: { threadId, status: { in: ["RINGING", "ACCEPTED"] }, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (active) return null;
      return tx.communicationCallSession.create({
        data: { threadId, conversationId: null, callerId: actor.id, calleeId: recipientId, mode, status: "RINGING", expiresAt: new Date(now.getTime() + 45_000) },
        select: { id: true, callerId: true, calleeId: true, mode: true, status: true, expiresAt: true, createdAt: true },
      });
    });
    if (!call) return NextResponse.json({ message: "Já existe uma chamada activa neste contexto." }, { status: 409 });
    return NextResponse.json({ call }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_CONTEXT_CALL_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível iniciar a chamada." }, { status: 500 });
  }
}
