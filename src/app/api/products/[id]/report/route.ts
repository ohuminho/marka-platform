import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { isProductReportReason, productReportReasonLabel } from "@/core/trust/product-report-policy";

const schema = z.object({ reason: z.string().refine(isProductReportReason), details: z.string().trim().max(800).optional().default("") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return NextResponse.json({ message: "Inicie sessão para denunciar este anúncio." }, { status: 401 });

  try {
    const { id: productId } = await context.params;
    const input = schema.parse(await request.json());
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true, store: { select: { vendor: { select: { ownerId: true } } } } },
    });
    if (!product || product.status !== "ACTIVE") return NextResponse.json({ message: "Anúncio não encontrado ou indisponível." }, { status: 404 });
    const sellerId = product.store.vendor.ownerId;
    if (sellerId === session.userId) return NextResponse.json({ message: "Não pode denunciar o seu próprio anúncio." }, { status: 403 });

    const created = await prisma.$transaction(async (tx) => {
      const recent = await tx.securityEvent.findFirst({
        where: { actorUserId: session.userId, type: "MARKETPLACE_PRODUCT_REPORTED", correlationId: productId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { id: true },
      });
      if (recent) return false;
      await tx.securityEvent.create({
        data: { actorUserId: session.userId, type: "MARKETPLACE_PRODUCT_REPORTED", severity: input.reason === "PROHIBITED_OR_ILLEGAL" ? "HIGH" : "INFO", correlationId: productId, metadata: { productId, sellerId, reason: input.reason, reasonLabel: productReportReasonLabel(input.reason as Parameters<typeof productReportReasonLabel>[0]), detailsProvided: Boolean(input.details.trim()) } },
      });
      await tx.riskSignal.create({
        data: { userId: sellerId, type: "CONDUCT_PRODUCT_LISTING_REPORTED", score: input.reason === "PROHIBITED_OR_ILLEGAL" ? 65 : 35, source: "MARKETPLACE_PRODUCT_REPORT", entityType: "PRODUCT", entityId: productId, reason: `Anúncio denunciado: ${productReportReasonLabel(input.reason as Parameters<typeof productReportReasonLabel>[0])}. Exige análise humana; denúncia isolada não comprova infracção.`, metadata: { productId, reporterId: session.userId, reason: input.reason, detailsProvided: Boolean(input.details.trim()) } },
      });
      return true;
    });
    if (!created) return NextResponse.json({ message: "Já enviou uma denúncia deste anúncio nas últimas 24 horas." }, { status: 409 });
    return NextResponse.json({ success: true, message: "Denúncia enviada para análise." }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Seleccione um motivo válido." }, { status: 400 });
    console.error("[MARKETPLACE_PRODUCT_REPORT_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível enviar a denúncia." }, { status: 503 });
  }
}
