import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicia sessão para responder." }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isFounder: true, status: true },
    });
    if (!user || ["SUSPENDED", "LOCKED", "DELETED"].includes(user.status)) return NextResponse.json({ message: "Conta indisponível." }, { status: 401 });
    const isStaff = user.isFounder || ["ADMIN", "SUPER_ADMIN", "SUPPORT", "OPERATIONS"].includes(user.role.toUpperCase());
    const { ticketId } = await context.params;
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, userId: true, status: true } });
    if (!ticket || (!isStaff && ticket.userId !== user.id)) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    if (ticket.status === "CLOSED") return NextResponse.json({ message: "Este pedido está encerrado." }, { status: 409 });
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 5000) : "";
    if (message.length < 2) return NextResponse.json({ message: "Escreve uma resposta com pelo menos 2 caracteres." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({ data: { ticketId, authorId: user.id, body: message, isStaff } });
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: isStaff ? "IN_PROGRESS" : "OPEN",
          lastReplyAt: new Date(),
          resolvedAt: null,
        },
      });
      return created;
    });
    return NextResponse.json({ message: result, isStaff }, { status: 201 });
  } catch (error) {
    console.error("[SUPPORT_MESSAGE_POST]", error);
    return NextResponse.json({ message: "Não foi possível enviar a resposta." }, { status: 500 });
  }
}
