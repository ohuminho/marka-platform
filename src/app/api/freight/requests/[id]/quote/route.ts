import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const decisionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Escolha aceitar ou rejeitar a cotação.", code: "INVALID_QUOTE_DECISION" },
      { status: 400 },
    );
  }

  const now = new Date();
  const nextStatus = parsed.data.decision === "ACCEPT" ? "AWAITING_PAYMENT" : "CANCELLED";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.freightRequest.updateMany({
        where: {
          id,
          organizationId: auth.session.organizationId,
          requesterId: auth.session.userId,
          status: "QUOTED",
          quotedAmount: { not: null },
          quoteExpiresAt: { gt: now },
        },
        data: { status: nextStatus },
      });

      if (updated.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId,
          actorType: "USER",
          organizationId: auth.session.organizationId,
          action: parsed.data.decision === "ACCEPT"
            ? "FREIGHT_QUOTE_ACCEPTED"
            : "FREIGHT_QUOTE_REJECTED",
          entityType: "FreightRequest",
          entityId: id,
          metadata: {
            decision: parsed.data.decision,
            resultingStatus: nextStatus,
            decidedAt: now.toISOString(),
          },
        },
      });

      return true;
    });

    if (!result) {
      const current = await prisma.freightRequest.findFirst({
        where: {
          id,
          organizationId: auth.session.organizationId,
          requesterId: auth.session.userId,
        },
        select: { status: true, quoteExpiresAt: true },
      });
      if (!current) {
        return NextResponse.json({ message: "Pedido não encontrado.", code: "FREIGHT_REQUEST_NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({
        message: current.quoteExpiresAt && current.quoteExpiresAt <= now
          ? "A cotação expirou. Solicite uma nova cotação à equipa MARKA."
          : "Esta cotação já não está disponível para decisão.",
        code: current.quoteExpiresAt && current.quoteExpiresAt <= now
          ? "FREIGHT_QUOTE_EXPIRED"
          : "FREIGHT_QUOTE_NOT_ACTIONABLE",
        status: current.status,
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      requestId: id,
      status: nextStatus,
      paymentRequired: parsed.data.decision === "ACCEPT",
      message: parsed.data.decision === "ACCEPT"
        ? "Cotação aceite. O pedido aguarda instruções de pagamento."
        : "Cotação rejeitada. O pedido foi encerrado.",
    });
  } catch (error) {
    console.error("[MARKA_FREIGHT_QUOTE_DECISION]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { message: "Não foi possível registar a decisão da cotação.", code: "FREIGHT_QUOTE_DECISION_FAILED" },
      { status: 500 },
    );
  }
}
