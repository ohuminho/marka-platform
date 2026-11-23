import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import { validateFreightQuoteSplitSnapshot } from "@/services/mobility/pricing/freight-quote-split-snapshot.service";

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
      // Lock the quote row so acceptance cannot race with an admin re-quote.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "FreightRequest"
        WHERE "id" = ${id}
          AND "organizationId" = ${auth.session.organizationId}
          AND "requesterId" = ${auth.session.userId}
          AND "status"::text = 'QUOTED'
          AND "quoteExpiresAt" > ${now}
        FOR UPDATE
      `;
      if (locked.length !== 1) return { ok: false as const, reason: "NOT_ACTIONABLE" as const };

      const current = await tx.freightRequest.findFirst({
        where: {
          id,
          organizationId: auth.session.organizationId,
          requesterId: auth.session.userId,
          status: "QUOTED",
          quoteExpiresAt: { gt: now },
        },
        select: {
          id: true,
          requestType: true,
          currency: true,
          quotedAmount: true,
          details: true,
          quoteExpiresAt: true,
        },
      });
      if (!current || current.quotedAmount === null) {
        return { ok: false as const, reason: "NOT_ACTIONABLE" as const };
      }

      let splitSnapshot: ReturnType<typeof validateFreightQuoteSplitSnapshot> = null;
      if (parsed.data.decision === "ACCEPT" && current.requestType === "CARGO_SHIPMENT") {
        const amount = Number(current.quotedAmount);
        if (current.currency !== "AOA" || !Number.isSafeInteger(amount) || amount <= 0) {
          return { ok: false as const, reason: "INVALID_FINANCIAL_SNAPSHOT" as const };
        }
        splitSnapshot = validateFreightQuoteSplitSnapshot(current.details, amount);
        if (!splitSnapshot) {
          return { ok: false as const, reason: "INVALID_FINANCIAL_SNAPSHOT" as const };
        }
      }

      const updated = await tx.freightRequest.updateMany({
        where: {
          id,
          organizationId: auth.session.organizationId,
          requesterId: auth.session.userId,
          status: "QUOTED",
          quotedAmount: current.quotedAmount,
          quoteExpiresAt: { gt: now },
        },
        data: { status: nextStatus },
      });
      if (updated.count !== 1) return { ok: false as const, reason: "NOT_ACTIONABLE" as const };

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
            quotedAmount: Number(current.quotedAmount),
            currency: current.currency,
            splitSnapshot: splitSnapshot
              ? {
                  version: splitSnapshot.version,
                  serviceType: splitSnapshot.serviceType,
                  currency: splitSnapshot.currency,
                  totalKz: splitSnapshot.totalKz,
                  commissionRate: splitSnapshot.commissionRate,
                  platformFeeKz: splitSnapshot.platformFeeKz,
                  providerAmountKz: splitSnapshot.providerAmountKz,
                  policyKey: splitSnapshot.policyKey,
                  policyVersion: splitSnapshot.policyVersion,
                }
              : null,
          },
        },
      });

      return { ok: true as const, splitSnapshot };
    });

    if (!result.ok) {
      if (result.reason === "INVALID_FINANCIAL_SNAPSHOT") {
        return NextResponse.json({
          message: "A divisão financeira desta cotação não passou na validação. Solicite uma nova cotação à equipa MARKA.",
          code: "FREIGHT_QUOTE_FINANCIAL_SNAPSHOT_INVALID",
        }, { status: 409 });
      }

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
      split: result.splitSnapshot,
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
