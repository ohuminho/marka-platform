import { NextResponse } from "next/server";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.freightRequest.findFirst({
        where: { id, organizationId: auth.session.organizationId, requesterId: auth.session.userId, status: "PROVIDER_COMPLETED_PENDING_CONFIRMATION" },
        select: { id: true, reference: true, status: true },
      });
      if (!current) throw new Error("FREIGHT_COMPLETION_NOT_CONFIRMABLE");
      const confirmedAt = new Date();
      const changed = await tx.freightRequest.updateMany({
        where: { id: current.id, organizationId: auth.session.organizationId, requesterId: auth.session.userId, status: "PROVIDER_COMPLETED_PENDING_CONFIRMATION" },
        data: { status: "COMPLETED" },
      });
      if (changed.count !== 1) throw new Error("FREIGHT_COMPLETION_CONFIRMATION_CONFLICT");
      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId, actorType: "USER", organizationId: auth.session.organizationId,
          action: "FREIGHT_COMPLETION_CONFIRMED_BY_REQUESTER", entityType: "FreightRequest", entityId: current.id,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: { reference: current.reference, previousStatus: current.status, newStatus: "COMPLETED", confirmedAt: confirmedAt.toISOString() },
        },
      });
      return { id: current.id, reference: current.reference, status: "COMPLETED", confirmedAt };
    });
    return NextResponse.json({ request: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_COMPLETION_CONFIRMATION_FAILED";
    const conflict = code === "FREIGHT_COMPLETION_NOT_CONFIRMABLE" || code === "FREIGHT_COMPLETION_CONFIRMATION_CONFLICT";
    return NextResponse.json({
      message: code === "FREIGHT_COMPLETION_NOT_CONFIRMABLE" ? "Este pedido não está à espera da sua confirmação ou não pertence à sua conta." :
        conflict ? "O estado do pedido mudou. Actualize o histórico e tente novamente." : "Não foi possível confirmar a conclusão do serviço.",
      code,
    }, { status: conflict ? 409 : 500 });
  }
}
