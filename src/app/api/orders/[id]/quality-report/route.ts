import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

const reasons = ["ITEM_NOT_AS_DESCRIBED", "WRONG_OR_MISSING_ITEM", "DAMAGED_OR_DEFECTIVE", "QUANTITY_MISMATCH", "DELIVERY_DISCREPANCY", "OTHER"] as const;
const schema = z.object({
  reason: z.enum(reasons),
  details: z.string().trim().max(1200).optional().default(""),
});

const labels: Record<(typeof reasons)[number], string> = {
  ITEM_NOT_AS_DESCRIBED: "Produto diferente da descrição",
  WRONG_OR_MISSING_ITEM: "Produto errado ou em falta",
  DAMAGED_OR_DEFECTIVE: "Produto danificado ou defeituoso",
  QUANTITY_MISMATCH: "Quantidade incorrecta",
  DELIVERY_DISCREPANCY: "Problema com a entrega",
  OTHER: "Outro problema",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return NextResponse.json({ message: "Inicie sessão para comunicar um problema." }, { status: 401 });

  try {
    const { id: orderId } = await params;
    const input = schema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, userId: session.userId },
        select: { id: true, status: true, fulfillment: { select: { status: true } }, items: { select: { id: true, productId: true, vendorId: true, quantity: true } } },
      });
      if (!order) return { error: "NOT_FOUND" as const };
      if (order.status !== "DELIVERED" && order.fulfillment?.status !== "COMPLETED") return { error: "NOT_DELIVERED" as const };
      if (!order.items.length) return { error: "NO_ITEMS" as const };
      const recent = await tx.securityEvent.findFirst({
        where: { actorUserId: session.userId, type: "MARKETPLACE_ORDER_QUALITY_REPORTED", correlationId: orderId },
        select: { id: true },
      });
      if (recent) return { error: "DUPLICATE" as const };

      const vendorIds = [...new Set(order.items.map((item) => item.vendorId).filter((value): value is string => Boolean(value)))];
      const vendors = await tx.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, ownerId: true } });
      await tx.securityEvent.create({
        data: {
          actorUserId: session.userId,
          type: "MARKETPLACE_ORDER_QUALITY_REPORTED",
          severity: "MEDIUM",
          correlationId: orderId,
          metadata: {
            orderId,
            reason: input.reason,
            reasonLabel: labels[input.reason],
            details: input.details || null,
            productIds: order.items.map((item) => item.productId),
            itemCount: order.items.length,
          },
        },
      });
      for (const vendor of vendors) {
        await tx.riskSignal.create({
          data: {
            userId: vendor.ownerId,
            type: "CONDUCT_ORDER_PRODUCT_DISPUTE",
            score: 35,
            source: "MARKETPLACE_ORDER_QUALITY_REPORT",
            entityType: "ORDER",
            entityId: orderId,
            reason: `Comprador comunicou: ${labels[input.reason]}. Requer análise e resposta do vendedor; não constitui prova de infracção.`,
            metadata: {
              orderId,
              vendorId: vendor.id,
              buyerId: session.userId,
              reason: input.reason,
              details: input.details || null,
              productIds: order.items.filter((item) => item.vendorId === vendor.id).map((item) => item.productId),
              responseRequested: true,
              automaticSanction: false,
            },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: session.userId,
          actorType: "USER",
          action: "MARKETPLACE_ORDER_QUALITY_REPORTED",
          entityType: "ORDER",
          entityId: orderId,
          correlationId: orderId,
          metadata: { reason: input.reason, vendorCount: vendors.length },
        },
      });
      return { success: true };
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") return NextResponse.json({ message: "Encomenda não encontrada." }, { status: 404 });
      if (result.error === "NOT_DELIVERED") return NextResponse.json({ message: "Só pode comunicar problemas de uma encomenda cuja entrega esteja concluída." }, { status: 409 });
      if (result.error === "NO_ITEMS") return NextResponse.json({ message: "A encomenda não contém artigos elegíveis." }, { status: 409 });
      return NextResponse.json({ message: "Já comunicou um problema nesta encomenda." }, { status: 409 });
    }
    return NextResponse.json({ success: true, message: "O problema foi registado para análise. O vendedor será chamado a responder." }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Seleccione um motivo válido." }, { status: 400 });
    console.error("[MARKETPLACE_ORDER_QUALITY_REPORT_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível registar o problema." }, { status: 503 });
  }
}
