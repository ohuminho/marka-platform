import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function getActor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AuthConfig.cookies.name)?.value;
  if (!token) return null;
  const session = await new SessionService().validate(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, isFounder: true, status: true },
  });
  if (!user || ["SUSPENDED", "LOCKED", "DELETED"].includes(user.status)) return null;
  return { ...user, isStaff: user.isFounder || ["ADMIN", "SUPER_ADMIN", "SUPPORT", "OPERATIONS"].includes(user.role.toUpperCase()) };
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar o suporte." }, { status: 401 });
    const tickets = await prisma.supportTicket.findMany({
      where: actor.isStaff ? {} : { userId: actor.id },
      orderBy: [{ updatedAt: "desc" }],
      take: actor.isStaff ? 200 : 50,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json({ tickets, isStaff: actor.isStaff });
  } catch (error) {
    console.error("[SUPPORT_TICKETS_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar os pedidos de suporte." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para abrir um pedido de suporte." }, { status: 401 });
    const body = await request.json();
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 120) : "";
    const category = typeof body?.category === "string" ? body.category.trim().slice(0, 40) : "Geral";
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 5000) : "";
    const priorityInput = typeof body?.priority === "string" ? body.priority.toUpperCase() : "NORMAL";
    const priority = ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priorityInput) ? priorityInput : "NORMAL";
    if (subject.length < 4 || description.length < 10) {
      return NextResponse.json({ message: "Indica um assunto (mínimo 4 caracteres) e descreve a situação com pelo menos 10 caracteres." }, { status: 400 });
    }
    const reference = `MK-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const ticket = await prisma.supportTicket.create({
      data: {
        reference, userId: actor.id, subject, category, description,
        priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        messages: { create: { authorId: actor.id, body: description, isStaff: false } },
      },
      include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } } },
    });
    return NextResponse.json({ ticket, message: "Pedido registado no suporte MARKA." }, { status: 201 });
  } catch (error) {
    console.error("[SUPPORT_TICKETS_POST]", error);
    return NextResponse.json({ message: "Não foi possível registar o pedido. Tenta novamente." }, { status: 500 });
  }
}


export async function PATCH(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para gerir pedidos." }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ message: "Apenas a equipa de suporte pode alterar o estado." }, { status: 403 });
    const body = await request.json();
    const ticketId = typeof body?.ticketId === "string" ? body.ticketId : "";
    const status = typeof body?.status === "string" ? body.status.toUpperCase() : "";
    if (!ticketId || !["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"].includes(status)) {
      return NextResponse.json({ message: "Pedido ou estado inválido." }, { status: 400 });
    }
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status as "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED",
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
      },
      select: { id: true, reference: true, status: true, resolvedAt: true },
    });
    return NextResponse.json({ ticket, message: "Estado do pedido actualizado." });
  } catch (error) {
    console.error("[SUPPORT_TICKET_PATCH]", error);
    return NextResponse.json({ message: "Não foi possível actualizar o estado do pedido." }, { status: 500 });
  }
}
