import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) {
      return NextResponse.json({ message: "Inicia sessão para responder." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isFounder: true, status: true },
    });
    if (!user || ["SUSPENDED", "LOCKED", "DELETED"].includes(user.status)) {
      return NextResponse.json({ message: "Conta indisponível." }, { status: 401 });
    }

    const isStaff = user.isFounder || ["ADMIN", "SUPER_ADMIN", "SUPPORT", "OPERATIONS"].includes(user.role.toUpperCase());
    const { ticketId } = await context.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, status: true },
    });
    if (!ticket || (!isStaff && ticket.userId !== user.id)) {
      return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    }
    if (ticket.status === "CLOSED") {
      return NextResponse.json({ message: "Este pedido está encerrado." }, { status: 409 });
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "O conteúdo da resposta é inválido." }, { status: 400 });
    }
    const rawMessage = (body as Record<string, unknown>).message;
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
    if (message.length < 2 || message.length > 5000) {
      return NextResponse.json(
        { message: "A resposta deve ter entre 2 e 5000 caracteres." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Conditional update prevents a reply racing with a concurrent ticket closure.
      const updated = await tx.supportTicket.updateMany({
        where: { id: ticketId, status: { not: "CLOSED" } },
        data: {
          status: isStaff ? "IN_PROGRESS" : "OPEN",
          lastReplyAt: new Date(),
          resolvedAt: null,
        },
      });
      if (updated.count === 0) {
        throw new Error("SUPPORT_TICKET_CLOSED");
      }

      return tx.supportMessage.create({
        data: { ticketId, authorId: user.id, body: message, isStaff },
      });
    });

    return NextResponse.json(
      { message: result, isStaff },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SUPPORT_TICKET_CLOSED") {
      return NextResponse.json({ message: "Este pedido está encerrado." }, { status: 409 });
    }
    console.error("[SUPPORT_MESSAGE_POST]", error);
    return NextResponse.json(
      { message: "Não foi possível enviar a resposta." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
