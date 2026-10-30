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

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar esta conversa." }, { status: 401 });
    const { conversationId } = await context.params;
    const conversation = await prisma.marketplaceConversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, image: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 500, include: { sender: { select: { id: true, name: true } } } },
      },
    });
    if (!conversation) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });

    await prisma.marketplaceMessage.updateMany({
      where: { conversationId, senderId: { not: actor.id }, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ conversation, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKETPLACE_CONVERSATION_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar esta conversa." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para enviar mensagens." }, { status: 401 });
    const { conversationId } = await context.params;
    const input = await request.json().catch(() => null) as { message?: unknown } | null;
    const body = typeof input?.message === "string" ? input.message.trim() : "";
    if (body.length < 2 || body.length > 5000) {
      return NextResponse.json({ message: "A mensagem deve ter entre 2 e 5000 caracteres." }, { status: 400 });
    }

    const conversation = await prisma.marketplaceConversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      select: { id: true },
    });
    if (!conversation) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.marketplaceMessage.create({
        data: { conversationId, senderId: actor.id, body },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.marketplaceConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
      return created;
    });
    return NextResponse.json({ message: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKETPLACE_MESSAGE_SEND]", error);
    return NextResponse.json({ message: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}
