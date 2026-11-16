import { NextResponse } from "next/server";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const note = body && typeof body === "object" && "note" in body && typeof body.note === "string"
    ? body.note.trim().slice(0, 500)
    : null;

  try {
    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.freightRequest.updateMany({
        where: {
          id,
          organizationId: auth.session.organizationId,
          requesterId: auth.session.userId,
          status: { in: ["REQUESTED", "QUOTED", "AWAITING_PAYMENT"] },
          paidAt: null,
          assignedProviderId: null,
        },
        data: { status: "CANCELLED" },
      });
      if (updated.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId,
          actorType: "USER",
          organizationId: auth.session.organizationId,
          action: "FREIGHT_REQUEST_CANCELLED_BY_REQUESTER",
          entityType: "FreightRequest",
          entityId: id,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: {
            note: note || null,
            cancelledAt: new Date().toISOString(),
            policy: "UNPAID_UNASSIGNED_ONLY",
          },
        },
      });
      return true;
    });

    if (!cancelled) {
      const current = await prisma.freightRequest.findFirst({
        where: { id, organizationId: auth.session.organizationId, requesterId: auth.session.userId },
        select: { status: true, paidAt: true, assignedProviderId: true },
      });
      if (!current) {
        return NextResponse.json({ message: "Pedido não encontrado.", code: "FREIGHT_REQUEST_NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({
        message: current.paidAt || current.assignedProviderId
          ? "Este serviço já entrou no ciclo financeiro ou operacional. Contacte o suporte para análise; não é possível cancelá-lo automaticamente."
          : "Este pedido já não pode ser cancelado neste estado.",
        code: current.paidAt || current.assignedProviderId
          ? "FREIGHT_CANCELLATION_REQUIRES_SUPPORT"
          : "FREIGHT_CANCELLATION_NOT_ALLOWED",
        status: current.status,
      }, { status: 409 });
    }

    return NextResponse.json({ success: true, requestId: id, status: "CANCELLED" });
  } catch (error) {
    console.error("[MARKA_FREIGHT_REQUEST_CANCEL]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({
      message: "Não foi possível cancelar o pedido.",
      code: "FREIGHT_REQUEST_CANCEL_FAILED",
    }, { status: 500 });
  }
}
