import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CommunicationContextError, getAuthorizedCommunicationThread, syncCommunicationThread } from "@/core/communications/communication-context.service";

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
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar mensagens." }, { status: 401 });
    const { threadId } = await context.params;
    await getAuthorizedCommunicationThread(threadId, actor.id);
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
      include: {
        participants: { where: { revokedAt: null }, include: { user: { select: { id: true, name: true } } } },
        messages: { orderBy: { createdAt: "asc" }, take: 500, include: { sender: { select: { id: true, name: true } } } },
      },
    });
    if (!thread) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });
    await prisma.communicationThreadMessage.updateMany({ where: { threadId, senderId: { not: actor.id }, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ thread, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_COMMUNICATION_THREAD_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar esta conversa." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para enviar mensagens." }, { status: 401 });
    const { threadId } = await context.params;
    await getAuthorizedCommunicationThread(threadId, actor.id);
    const input = await request.json().catch(() => null) as { message?: unknown } | null;
    const body = typeof input?.message === "string" ? input.message.trim() : "";
    if (body.length < 2 || body.length > 5000) return NextResponse.json({ message: "A mensagem deve ter entre 2 e 5000 caracteres." }, { status: 400 });
    const { inspectMarketplaceMessage } = await import("@/core/marketplace/message-policy");
    const policy = inspectMarketplaceMessage(body);
    if (!policy.allowed) return NextResponse.json({ message: policy.reason, code: policy.code }, { status: 422 });
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.communicationThreadMessage.create({
        data: { threadId, senderId: actor.id, body },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.communicationThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
      return created;
    });
    return NextResponse.json({ message: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_COMMUNICATION_THREAD_SEND]", error);
    return NextResponse.json({ message: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}
