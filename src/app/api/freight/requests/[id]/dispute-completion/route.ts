import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const disputeSchema = z.object({ note: z.string().trim().min(5).max(2000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Descreva o problema com pelo menos 5 caracteres.", code: "INVALID_COMPLETION_DISPUTE" }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.freightRequest.findFirst({
        where: { id, organizationId: auth.session.organizationId, requesterId: auth.session.userId, status: "PROVIDER_COMPLETED_PENDING_CONFIRMATION" },
        select: { id: true, reference: true, status: true, assignedProviderId: true },
      });
      if (!current) throw new Error("FREIGHT_COMPLETION_NOT_DISPUTABLE");
      if (current.assignedProviderId) await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${current.assignedProviderId}))`;
      const changed = await tx.freightRequest.updateMany({
        where: { id: current.id, organizationId: auth.session.organizationId, requesterId: auth.session.userId, status: "PROVIDER_COMPLETED_PENDING_CONFIRMATION" },
        data: { status: "EXCEPTION" },
      });
      if (changed.count !== 1) throw new Error("FREIGHT_COMPLETION_DISPUTE_CONFLICT");
      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId, actorType: "USER", organizationId: auth.session.organizationId,
          action: "FREIGHT_STATUS_EXCEPTION", entityType: "FreightRequest", entityId: current.id,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: { reference: current.reference, previousStatus: current.status, newStatus: "EXCEPTION", reportedBy: "REQUESTER", note: parsed.data.note, changedAt: new Date().toISOString() },
        },
      });
      return { id: current.id, reference: current.reference, status: "EXCEPTION" };
    });
    return NextResponse.json({ request: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_COMPLETION_DISPUTE_FAILED";
    const conflict = code === "FREIGHT_COMPLETION_NOT_DISPUTABLE" || code === "FREIGHT_COMPLETION_DISPUTE_CONFLICT";
    return NextResponse.json({
      message: code === "FREIGHT_COMPLETION_NOT_DISPUTABLE" ? "Este pedido já não aguarda confirmação ou não pertence à sua conta." :
        conflict ? "O estado do pedido mudou. Actualize o histórico e tente novamente." : "Não foi possível registar a ocorrência.",
      code,
    }, { status: conflict ? 409 : 500 });
  }
}
