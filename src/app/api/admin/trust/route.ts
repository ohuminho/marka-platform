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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const conductWhere = { type: { startsWith: "CONDUCT_" } };
    const [signals, total, open, critical] = await Promise.all([
      prisma.riskSignal.findMany({
        where: conductWhere,
        orderBy: [{ createdAt: "desc" }],
        take: 100,
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
    const responses = orderIds.length ? await prisma.securityEvent.findMany({
      where: { type: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE", correlationId: { in: orderIds } },
      orderBy: { createdAt: "asc" },
      select: { correlationId: true, metadata: true, createdAt: true, actorUserId: true },
    }) : [];
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
      return { ...signal, metadata: { ...metadata, vendorResponse: response ? { response: response.response, createdAt: response.createdAt, vendorUserId: response.vendorUserId } : null } };
    });
    return NextResponse.json({ signals: enrichedSignals, metrics: { total, open, critical } }, {
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
          metadata: { fromStatus: existing.status, toStatus: input.status, policyType: existing.type },
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
