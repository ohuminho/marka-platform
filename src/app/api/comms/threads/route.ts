import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CommunicationContextError, assertCommunicationContextParticipant, getAuthorizedCommunicationThread, syncCommunicationThread } from "@/core/communications/communication-context.service";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar as conversas." }, { status: 401 });
    const memberships = await prisma.communicationThreadParticipant.findMany({
      where: { userId: actor.id, revokedAt: null, thread: { status: "ACTIVE" } },
      select: { threadId: true }, orderBy: { thread: { lastMessageAt: "desc" } }, take: 100,
    });
    const threads = [];
    for (const membership of memberships) {
      try {
        const thread = await getAuthorizedCommunicationThread(membership.threadId, actor.id);
        const details = await prisma.communicationThread.findUnique({
          where: { id: thread.id },
          include: {
            participants: { where: { revokedAt: null }, include: { user: { select: { id: true, name: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true } },
          },
        });
        if (details) threads.push(details);
      } catch {
        // Context ended or membership revoked; omit it from the active inbox.
      }
    }
    return NextResponse.json({ threads, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_COMMUNICATION_THREADS_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar as conversas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para abrir a conversa." }, { status: 401 });
    const input = await request.json().catch(() => null) as { contextType?: unknown; contextId?: unknown } | null;
    const contextType = input?.contextType === "MOBILITY" || input?.contextType === "DELIVERY" ? input.contextType : null;
    const contextId = typeof input?.contextId === "string" ? input.contextId.trim() : "";
    if (!contextType || !contextId || contextId.length > 128) return NextResponse.json({ message: "Contexto de comunicação inválido." }, { status: 400 });
    await assertCommunicationContextParticipant(contextType, contextId, actor.id);
    const thread = await syncCommunicationThread(contextType, contextId);
    return NextResponse.json({ thread }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_COMMUNICATION_THREAD_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível abrir a conversa." }, { status: 500 });
  }
}
