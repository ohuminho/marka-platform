import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { inspectMarketplaceMessage } from "@/core/marketplace/message-policy";
import { getAuthorizedCommunicationThread } from "@/core/communications/communication-context.service";
import { reserveCommunicationWrite } from "@/core/communications/communication-write-limit";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  return user?.status === "ACTIVE" ? user : null;
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar as mensagens." }, { status: 401 });

    const conversations = await prisma.marketplaceConversation.findMany({
      where: { OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, image: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true } },
      },
    });

    const memberships = await prisma.communicationThreadParticipant.findMany({
      where: { userId: actor.id, revokedAt: null, thread: { status: "ACTIVE" } },
      select: { threadId: true }, orderBy: { thread: { lastMessageAt: "desc" } }, take: 100,
    });
    const threads = [];
    for (const membership of memberships) {
      try {
        await getAuthorizedCommunicationThread(membership.threadId, actor.id);
        const thread = await prisma.communicationThread.findUnique({
          where: { id: membership.threadId },
          include: {
            participants: { where: { revokedAt: null }, include: { user: { select: { id: true, name: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true } },
          },
        });
        if (thread) threads.push(thread);
      } catch {
        // Ended or revoked contexts are excluded from the active inbox.
      }
    }

    return NextResponse.json({ conversations, threads, actorId: actor.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKETPLACE_MESSAGES_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar as conversas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para contactar o vendedor." }, { status: 401 });

    const input = await request.json().catch(() => null) as { productId?: unknown; message?: unknown } | null;
    const productId = typeof input?.productId === "string" ? input.productId.trim() : "";
    const body = typeof input?.message === "string" ? input.message.trim() : "";
    if (!productId || body.length < 2 || body.length > 2000) {
      return NextResponse.json({ message: "Produto ou mensagem inválida. A mensagem deve ter entre 2 e 2000 caracteres." }, { status: 400 });
    }

    const policy = inspectMarketplaceMessage(body);
    if (!policy.allowed) return NextResponse.json({ message: policy.reason, code: policy.code }, { status: 422 });

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "ACTIVE", store: { status: "ACTIVE", vendor: { status: "ACTIVE" } } },
      select: { id: true, name: true, storeId: true, store: { select: { vendor: { select: { ownerId: true } } } } },
    });
    if (!product) return NextResponse.json({ message: "Este produto já não está disponível." }, { status: 404 });
    const sellerId = product.store.vendor.ownerId;
    if (sellerId === actor.id) return NextResponse.json({ message: "Não podes iniciar uma conversa contigo próprio." }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      if (!(await reserveCommunicationWrite(tx, actor.id, "SEND"))) return null;
      const thread = await tx.marketplaceConversation.upsert({
        where: { buyerId_sellerId_productId: { buyerId: actor.id, sellerId, productId: product.id } },
        create: { buyerId: actor.id, sellerId, storeId: product.storeId, productId: product.id, subject: product.name },
        update: { lastMessageAt: new Date() },
        select: { id: true, buyerId: true, sellerId: true, productId: true, storeId: true },
      });
      const message = await tx.marketplaceMessage.create({
        data: { conversationId: thread.id, senderId: actor.id, body },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.marketplaceConversation.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });
      return { conversation: thread, message };
    });
    if (!result) return NextResponse.json({ message: "Atingiste o limite de 20 mensagens por minuto. Aguarda um minuto." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });

    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKETPLACE_MESSAGES_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível abrir a conversa. Tenta novamente." }, { status: 500 });
  }
}
