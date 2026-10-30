import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { getAuthorizedCommunicationThread } from "@/core/communications/communication-context.service";

export async function GET() {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicia sessão para consultar chamadas." }, { status: 401 });
    const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
    if (actor?.status !== "ACTIVE") return NextResponse.json({ message: "Conta sem autorização." }, { status: 403 });

    const now = new Date();
    await prisma.communicationCallSession.updateMany({
      where: { calleeId: actor.id, status: "RINGING", expiresAt: { lte: now } },
      data: { status: "MISSED", endedAt: now },
    });
    const calls = await prisma.communicationCallSession.findMany({
      where: { calleeId: actor.id, status: "RINGING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" }, take: 5,
      include: {
        caller: { select: { id: true, name: true } },
        conversation: { select: { id: true, buyerId: true, sellerId: true, product: { select: { name: true } } } },
        thread: { select: { id: true, contextType: true, contextId: true, subject: true } },
      },
    });
    const incoming = [];
    for (const call of calls) {
      if (call.conversation) {
        if (call.conversation.buyerId !== actor.id && call.conversation.sellerId !== actor.id) continue;
        incoming.push({
          id: call.id, callerName: call.caller.name, mode: call.mode, expiresAt: call.expiresAt,
          conversationId: call.conversation.id, threadId: null,
          contextLabel: call.conversation.product.name,
        });
      } else if (call.thread) {
        try {
          await getAuthorizedCommunicationThread(call.thread.id, actor.id);
          incoming.push({
            id: call.id, callerName: call.caller.name, mode: call.mode, expiresAt: call.expiresAt,
            conversationId: null, threadId: call.thread.id,
            contextLabel: call.thread.subject ?? (call.thread.contextType === "MOBILITY" ? "MARKA Mobility" : "MARKA Delivery"),
          });
        } catch {
          // Context access was revoked or the underlying service is no longer active.
        }
      }
    }
    return NextResponse.json({ calls: incoming }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_INCOMING_CALLS]", error);
    return NextResponse.json({ message: "Não foi possível consultar chamadas recebidas." }, { status: 500 });
  }
}
