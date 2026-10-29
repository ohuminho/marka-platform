import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

const SUPPORT_CATEGORIES = [
  "Viagens e pedidos",
  "Conta e autenticação",
  "Motorista e candidatura",
  "Pagamentos e carteira",
  "Segurança e reclamação",
  "Aplicação e erros técnicos",
  "Outro assunto",
] as const;
const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"] as const;

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

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

  return {
    ...user,
    isStaff: user.isFounder || ["ADMIN", "SUPER_ADMIN", "SUPPORT", "OPERATIONS"].includes(user.role.toUpperCase()),
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json(
        { message: "Inicia sessão para consultar o suporte." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: actor.isStaff ? {} : { userId: actor.id },
      orderBy: [{ updatedAt: "desc" }],
      take: actor.isStaff ? 200 : 50,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(
      { tickets, isStaff: actor.isStaff },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[SUPPORT_TICKETS_GET]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar os pedidos de suporte." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json(
        { message: "Inicia sessão para abrir um pedido de suporte." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "O conteúdo do pedido é inválido." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const subject = typeof input.subject === "string" ? input.subject.trim() : "";
    const category = typeof input.category === "string" ? input.category.trim() : "Outro assunto";
    const description = typeof input.description === "string" ? input.description.trim() : "";
    const priorityInput = typeof input.priority === "string" ? input.priority.toUpperCase() : "NORMAL";

    if (subject.length < 4 || subject.length > 120 || description.length < 10 || description.length > 5000) {
      return NextResponse.json(
        { message: "O assunto deve ter 4–120 caracteres e a descrição deve ter 10–5000 caracteres." },
        { status: 400 },
      );
    }
    if (!(SUPPORT_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ message: "Selecciona uma categoria de suporte válida." }, { status: 400 });
    }
    if (!(SUPPORT_PRIORITIES as readonly string[]).includes(priorityInput)) {
      return NextResponse.json({ message: "Selecciona uma prioridade válida." }, { status: 400 });
    }

    const reference = `MK-${new Date().getFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
    const ticket = await prisma.supportTicket.create({
      data: {
        reference,
        userId: actor.id,
        subject,
        category,
        description,
        priority: priorityInput as (typeof SUPPORT_PRIORITIES)[number],
        messages: {
          create: { authorId: actor.id, body: description, isStaff: false },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(
      { ticket, message: "Pedido registado no suporte MARKA." },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[SUPPORT_TICKETS_POST]", error);
    return NextResponse.json(
      { message: "Não foi possível registar o pedido. Tenta novamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json({ message: "Inicia sessão para gerir pedidos." }, { status: 401 });
    }
    if (!actor.isStaff) {
      return NextResponse.json({ message: "Apenas a equipa de suporte pode alterar o estado." }, { status: 403 });
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "O conteúdo do pedido é inválido." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const ticketId = typeof input.ticketId === "string" ? input.ticketId.trim() : "";
    const status = typeof input.status === "string" ? input.status.toUpperCase() : "";
    if (!ticketId || !(SUPPORT_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ message: "Pedido ou estado inválido." }, { status: 400 });
    }

    const existing = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Pedido de suporte não encontrado." }, { status: 404 });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status as (typeof SUPPORT_STATUSES)[number],
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
      select: { id: true, reference: true, status: true, resolvedAt: true },
    });

    return NextResponse.json(
      { ticket, message: "Estado do pedido actualizado." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[SUPPORT_TICKET_PATCH]", error);
    return NextResponse.json(
      { message: "Não foi possível actualizar o estado do pedido." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
