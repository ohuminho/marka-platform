import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";

async function getActor() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

export async function GET(request: Request, context: { params: Promise<{ callId: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para consultar a sinalização." }, { status: 401 });
    const { callId } = await context.params;
    const call = await prisma.communicationCallSession.findFirst({
      where: { id: callId, OR: [{ callerId: actor.id }, { calleeId: actor.id }], status: { in: ["RINGING", "ACCEPTED"] }, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!call) return NextResponse.json({ message: "Chamada não encontrada ou sem autorização." }, { status: 404 });
    const url = new URL(request.url);
    const afterRaw = url.searchParams.get("after");
    const after = afterRaw ? new Date(afterRaw) : new Date(Date.now() - 30_000);
    if (Number.isNaN(after.getTime())) return NextResponse.json({ message: "Cursor inválido." }, { status: 400 });
    const signals = await prisma.communicationCallSignal.findMany({
      where: { callId, senderId: { not: actor.id }, expiresAt: { gt: new Date() }, createdAt: { gt: after } },
      orderBy: { createdAt: "asc" }, take: 100,
      select: { id: true, type: true, payload: true, createdAt: true },
    });
    return NextResponse.json({ signals }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_CALL_SIGNALS_GET]", error);
    return NextResponse.json({ message: "Não foi possível consultar a sinalização." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ callId: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ message: "Inicia sessão para enviar sinalização." }, { status: 401 });
    const { callId } = await context.params;
    const input = await request.json().catch(() => null) as { type?: unknown; payload?: unknown } | null;
    const type = input?.type === "OFFER" || input?.type === "ANSWER" || input?.type === "ICE_CANDIDATE" ? input.type : null;
    if (!type) {
      return NextResponse.json({ message: "Tipo de sinalização inválido." }, { status: 400 });
    }
    if (!input?.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
      return NextResponse.json({ message: "Payload WebRTC inválido." }, { status: 400 });
    }
    const serialized = JSON.stringify(input.payload);
    const maxBytes = type === "ICE_CANDIDATE" ? 4_000 : 16_000;
    if (new TextEncoder().encode(serialized).length > maxBytes) {
      return NextResponse.json({ message: "Payload WebRTC excede o limite permitido." }, { status: 413 });
    }
    const call = await prisma.communicationCallSession.findFirst({
      where: { id: callId, OR: [{ callerId: actor.id }, { calleeId: actor.id }], status: { in: ["RINGING", "ACCEPTED"] }, expiresAt: { gt: new Date() } },
      select: { callerId: true, calleeId: true },
    });
    if (!call) return NextResponse.json({ message: "Chamada não encontrada ou sem autorização." }, { status: 404 });
    if (type === "OFFER" && actor.id !== call.callerId) return NextResponse.json({ message: "A oferta inicial pertence ao iniciador da chamada." }, { status: 403 });
    if (type === "ANSWER" && actor.id !== call.calleeId) return NextResponse.json({ message: "A resposta pertence ao destinatário da chamada." }, { status: 403 });

    const signal = await prisma.communicationCallSignal.create({
      data: { callId, senderId: actor.id, type, payload: input.payload as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 5 * 60_000) },
      select: { id: true, type: true, createdAt: true },
    });
    return NextResponse.json({ signal }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_CALL_SIGNALS_POST]", error);
    return NextResponse.json({ message: "Não foi possível enviar a sinalização." }, { status: 500 });
  }
}
