import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { CommunicationContextError, getAuthorizedCommunicationThread } from "@/core/communications/communication-context.service";
import { reserveCommunicationWrite } from "@/core/communications/communication-write-limit";

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
      if (!(await reserveCommunicationWrite(tx, actor.id, "SEND"))) return null;
      const created = await tx.communicationThreadMessage.create({
        data: { threadId, senderId: actor.id, body },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.communicationThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
      return created;
    });
    if (!result) {
      return NextResponse.json({ message: "Atingiste o limite temporário de mensagens. Aguarda um minuto." }, {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ message: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_COMMUNICATION_THREAD_SEND]", error);
    return NextResponse.json({ message: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}


export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para editar mensagens." }, { status: 401 });
    const { threadId } = await context.params;
    await getAuthorizedCommunicationThread(threadId, actor.id);
    const input = await request.json().catch(() => null) as { messageId?: unknown; message?: unknown } | null;
    const messageId = typeof input?.messageId === "string" ? input.messageId.trim() : "";
    const body = typeof input?.message === "string" ? input.message.trim() : "";
    if (!messageId || body.length < 2 || body.length > 5000) {
      return NextResponse.json({ message: "Mensagem inválida. O texto deve ter entre 2 e 5000 caracteres." }, { status: 400 });
    }
    const { inspectMarketplaceMessage } = await import("@/core/marketplace/message-policy");
    const policy = inspectMarketplaceMessage(body);
    if (!policy.allowed) return NextResponse.json({ message: policy.reason, code: policy.code }, { status: 422 });
    const result = await prisma.$transaction(async (tx) => {
      if (!(await reserveCommunicationWrite(tx, actor.id, "EDIT"))) return { limited: true as const };
      const updated = await tx.communicationThreadMessage.updateMany({
        where: { id: messageId, threadId, senderId: actor.id },
        data: { body, editedAt: new Date() },
      });
      if (!updated.count) return { missing: true as const };
      const message = await tx.communicationThreadMessage.findUnique({
        where: { id: messageId }, include: { sender: { select: { id: true, name: true } } },
      });
      return { message };
    });
    if ("limited" in result) return NextResponse.json({ message: "Atingiste o limite de 10 edições por minuto." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    if ("missing" in result) return NextResponse.json({ message: "Mensagem não encontrada ou não pertence a ti." }, { status: 404 });
    const message = result.message;
    return NextResponse.json({ message }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CommunicationContextError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("[MARKA_COMMUNICATION_MESSAGE_EDIT]", error);
    return NextResponse.json({ message: "Não foi possível editar a mensagem." }, { status: 500 });
  }
}
