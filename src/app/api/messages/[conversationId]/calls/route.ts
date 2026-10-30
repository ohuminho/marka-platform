import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

type Context = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar chamadas." }, { status: 401 });
    const { conversationId } = await context.params;
    const conversation = await prisma.marketplaceConversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      select: { id: true },
    });
    if (!conversation) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });

    const now = new Date();
    await prisma.communicationCallSession.updateMany({
      where: { conversationId, status: "RINGING", expiresAt: { lte: now } },
      data: { status: "MISSED", endedAt: now },
    });
    const calls = await prisma.communicationCallSession.findMany({
      where: { conversationId, OR: [{ callerId: actor.id }, { calleeId: actor.id }] },
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, callerId: true, calleeId: true, mode: true, status: true, expiresAt: true, acceptedAt: true, endedAt: true, createdAt: true },
    });
    return NextResponse.json({ calls, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_CALLS_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar as chamadas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para iniciar uma chamada." }, { status: 401 });
    const { conversationId } = await context.params;
    const input = await request.json().catch(() => null) as { mode?: unknown } | null;
    const mode = input?.mode === "VIDEO" ? "VIDEO" : input?.mode === "AUDIO" || input?.mode == null ? "AUDIO" : null;
    if (!mode) return NextResponse.json({ message: "Tipo de chamada inválido." }, { status: 400 });

    const conversation = await prisma.marketplaceConversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      select: { id: true, buyerId: true, sellerId: true },
    });
    if (!conversation) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });
    const calleeId = conversation.buyerId === actor.id ? conversation.sellerId : conversation.buyerId;
    if (calleeId === actor.id) return NextResponse.json({ message: "Não podes ligar a ti próprio." }, { status: 409 });

    const call = await prisma.$transaction(async (tx) => {
      // Serialize call creation per conversation so simultaneous taps cannot create parallel ringing sessions.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${conversationId}))`;
      const now = new Date();
      await tx.communicationCallSession.updateMany({
        where: { conversationId, status: "RINGING", expiresAt: { lte: now } },
        data: { status: "MISSED", endedAt: now },
      });
      const active = await tx.communicationCallSession.findFirst({
        where: { conversationId, status: { in: ["RINGING", "ACCEPTED"] }, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (active) return null;
      return tx.communicationCallSession.create({
        data: { conversationId, callerId: actor.id, calleeId, mode, status: "RINGING", expiresAt: new Date(now.getTime() + 45_000) },
        select: { id: true, callerId: true, calleeId: true, mode: true, status: true, expiresAt: true, createdAt: true },
      });
    });
    if (!call) return NextResponse.json({ message: "Já existe uma chamada activa nesta conversa." }, { status: 409 });
    return NextResponse.json({ call }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_CALL_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível iniciar a chamada." }, { status: 500 });
  }
}
