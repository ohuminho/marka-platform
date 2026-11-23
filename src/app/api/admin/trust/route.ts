import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function requireAdmin() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, role: true },
  });
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ message: "Administrative access required." }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    const requestedOffset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 50;
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0;
    const statusFilter = url.searchParams.get("status");
    const sourceFilter = url.searchParams.get("source")?.trim();
    const search = url.searchParams.get("search")?.trim().slice(0, 100);
    const conductWhere = {
      type: { startsWith: "CONDUCT_" },
      ...(statusFilter && ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"].includes(statusFilter) ? { status: statusFilter as "OPEN" | "REVIEWED" | "RESOLVED" | "DISMISSED" } : {}),
      ...(sourceFilter ? { source: sourceFilter } : {}),
      ...(search ? { OR: [
        { type: { contains: search, mode: "insensitive" as const } },
        { reason: { contains: search, mode: "insensitive" as const } },
        { subject: { name: { contains: search, mode: "insensitive" as const } } },
        { subject: { email: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const [signals, total, open, critical] = await Promise.all([
      prisma.riskSignal.findMany({
        where: conductWhere,
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true, userId: true, type: true, score: true, status: true,
          source: true, reason: true, metadata: true, createdAt: true,
          subject: { select: { id: true, name: true, email: true, role: true, status: true } },
        },
      }),
      prisma.riskSignal.count({ where: conductWhere }),
      prisma.riskSignal.count({ where: { ...conductWhere, status: "OPEN" } }),
      prisma.riskSignal.count({ where: { ...conductWhere, status: "OPEN", score: { gte: 80 } } }),
    ]);
    const orderIds = signals.map((signal) => {
      const metadata = signal.metadata && typeof signal.metadata === "object" ? signal.metadata as Record<string, unknown> : {};
      return typeof metadata.orderId === "string" ? metadata.orderId : null;
    }).filter((value): value is string => Boolean(value));
    const signalIds = signals.map((signal) => signal.id);
    const [responses, auditRows] = await Promise.all([
      orderIds.length ? prisma.securityEvent.findMany({
      where: { type: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE", correlationId: { in: orderIds } },
      orderBy: { createdAt: "asc" },
      select: { correlationId: true, metadata: true, createdAt: true, actorUserId: true },
      }) : Promise.resolve([]),
      signalIds.length ? prisma.auditLog.findMany({
        where: { entityType: "RISK_SIGNAL", entityId: { in: signalIds }, action: "TRUST_SIGNAL_STATUS_UPDATED" },
        orderBy: { createdAt: "desc" },
        take: Math.min(signalIds.length * 10, 500),
        select: { entityId: true, metadata: true, createdAt: true, actor: { select: { id: true, name: true, email: true } } },
      }) : Promise.resolve([]),
    ]);
    const auditBySignal = new Map<string, Array<{ status: string; note: string | null; createdAt: Date; actor: { id: string; name: string; email: string } | null }>>();
    for (const row of auditRows) {
      if (!row.entityId) continue;
      const meta = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
      const list = auditBySignal.get(row.entityId) ?? [];
      list.push({ status: typeof meta.toStatus === "string" ? meta.toStatus : "UPDATED", note: typeof meta.decisionNote === "string" ? meta.decisionNote : null, createdAt: row.createdAt, actor: row.actor });
      auditBySignal.set(row.entityId, list);
    }
    const responseByOrder = new Map<string, { response: string; createdAt: Date; vendorUserId: string | null }>();
    for (const event of responses) {
      const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
      if (event.correlationId && typeof metadata.response === "string") {
        responseByOrder.set(event.correlationId, { response: metadata.response, createdAt: event.createdAt, vendorUserId: event.actorUserId });
      }
    }
    const enrichedSignals = signals.map((signal) => {
      const metadata = signal.metadata && typeof signal.metadata === "object" ? signal.metadata as Record<string, unknown> : {};
      const response = typeof metadata.orderId === "string" ? responseByOrder.get(metadata.orderId) : undefined;
      return { ...signal, metadata: { ...metadata, vendorResponse: response ? { response: response.response, createdAt: response.createdAt, vendorUserId: response.vendorUserId } : null }, history: auditBySignal.get(signal.id) ?? [] };
    });
    const appealEvents = await prisma.securityEvent.findMany({
      where: { type: { in: ["TRUST_APPEAL_SUBMITTED", "TRUST_APPEAL_ACCEPTED", "TRUST_APPEAL_REJECTED"] } },
      orderBy: { createdAt: "desc" }, take: 300,
      select: { id: true, type: true, actorUserId: true, correlationId: true, metadata: true, createdAt: true, actor: { select: { id: true, name: true, email: true } } },
    });
    const appeals = appealEvents.filter(event => event.type === "TRUST_APPEAL_SUBMITTED").map(event => {
      const meta = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
      const decision = appealEvents.find(candidate => {
        if (candidate.type === "TRUST_APPEAL_SUBMITTED") return false;
        const candidateMeta = candidate.metadata && typeof candidate.metadata === "object" ? candidate.metadata as Record<string, unknown> : {};
        return candidateMeta.appealEventId === event.id;
      });
      const decisionMeta = decision?.metadata && typeof decision.metadata === "object" ? decision.metadata as Record<string, unknown> : {};
      return { id: event.id, userId: event.correlationId, userName: event.actor?.name ?? "Conta MARKA", userEmail: event.actor?.email ?? "", signalId: typeof meta.signalId === "string" ? meta.signalId : "", appealText: typeof meta.appealText === "string" ? meta.appealText : "", submittedAt: event.createdAt, decision: !decision ? "PENDING" : decision.type === "TRUST_APPEAL_ACCEPTED" ? "ACCEPTED" : "REJECTED", decisionReason: typeof decisionMeta.reason === "string" ? decisionMeta.reason : null };
    });
    return NextResponse.json({ signals: enrichedSignals, appeals, metrics: { total, open, critical }, pagination: { limit, offset, hasMore: offset + signals.length < total } }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[MARKA_TRUST_QUEUE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível carregar a fila de confiança." }, { status: 503 });
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"]),
  decisionNote: z.string().trim().min(10).max(1000).optional(),
}).superRefine((value, context) => {
  if ((value.status === "RESOLVED" || value.status === "DISMISSED") && !value.decisionNote) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["decisionNote"], message: "Justificação obrigatória (10 a 1000 caracteres)." });
  }
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const input = updateSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.riskSignal.findUnique({ where: { id: input.id }, select: { id: true, type: true, status: true } });
      if (!existing || !existing.type.startsWith("CONDUCT_")) return null;
      const updated = await tx.riskSignal.update({
        where: { id: input.id },
        data: { status: input.status },
        select: { id: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actorType: "USER",
          action: "TRUST_SIGNAL_STATUS_UPDATED",
          entityType: "RISK_SIGNAL",
          entityId: existing.id,
          metadata: { fromStatus: existing.status, toStatus: input.status, policyType: existing.type, decisionNote: input.decisionNote ?? null, decisionAt: new Date().toISOString() },
        },
      });
      return updated;
    });
    if (!result) return NextResponse.json({ message: "Ocorrência não encontrada." }, { status: 404 });
    return NextResponse.json({ signal: result }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Actualização inválida.", issues: error.issues }, { status: 400 });
    }
    console.error("[MARKA_TRUST_QUEUE_UPDATE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível actualizar a ocorrência." }, { status: 503 });
  }
}
