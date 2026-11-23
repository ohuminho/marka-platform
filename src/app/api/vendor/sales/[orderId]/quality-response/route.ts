import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { prisma } from "@/database/client/prisma";

const schema = z.object({ organizationId: z.string().min(1), response: z.string().trim().min(20).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicie sessão para responder." }, { status: 401 });
    const input = schema.parse(await request.json());
    const authorization = new AuthorizationService();
    if (!(await authorization.hasPermission(session.userId, Permissions.ORDER_MANAGE, input.organizationId))) {
      return NextResponse.json({ message: "Sem permissão para responder a esta ocorrência." }, { status: 403 });
    }
    const { orderId } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({
        where: { ownerId: session.userId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!vendor) return { error: "VENDOR_NOT_FOUND" as const };
      const order = await tx.order.findFirst({
        where: { id: orderId, OR: [{ status: "DELIVERED" }, { fulfillment: { status: "COMPLETED" } }], items: { some: { vendorId: vendor.id } } },
        select: { id: true, userId: true },
      });
      if (!order) return { error: "ORDER_NOT_FOUND" as const };
      const signal = await tx.riskSignal.findFirst({
        where: { type: "CONDUCT_ORDER_PRODUCT_DISPUTE", entityId: orderId, userId: session.userId, status: { in: ["OPEN", "REVIEWED"] } },
        select: { id: true },
      });
      if (!signal) return { error: "REPORT_NOT_FOUND" as const };
      const previous = await tx.securityEvent.findFirst({
        where: { type: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE", correlationId: orderId, actorUserId: session.userId },
        select: { id: true },
      });
      if (previous) return { error: "ALREADY_RESPONDED" as const };
      await tx.securityEvent.create({
        data: {
          actorUserId: session.userId,
          type: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE",
          severity: "INFO",
          correlationId: orderId,
          metadata: { orderId, vendorId: vendor.id, response: input.response },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: session.userId, actorType: "USER",
          action: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE",
          entityType: "ORDER", entityId: orderId, correlationId: orderId,
          metadata: { vendorId: vendor.id, responseLength: input.response.length },
        },
      });
      await tx.notification.create({
        data: {
          userId: order.userId,
          type: "MARKETPLACE_ORDER_QUALITY_VENDOR_RESPONSE",
          title: "Resposta do vendedor recebida",
          message: "O vendedor respondeu à comunicação sobre a sua encomenda. A equipa MARKA continuará a análise.",
          data: { orderId },
        },
      });
      return { success: true };
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });
    if ("error" in result) {
      const messages: Record<string, string> = {
        VENDOR_NOT_FOUND: "Loja não encontrada nesta organização.",
        ORDER_NOT_FOUND: "Encomenda não encontrada ou não pertence à sua loja.",
        REPORT_NOT_FOUND: "Não existe uma ocorrência aberta para esta encomenda.",
        ALREADY_RESPONDED: "A sua resposta já foi registada.",
      };
      const status = result.error === "VENDOR_NOT_FOUND" || result.error === "ORDER_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ message: messages[result.error] }, { status });
    }
    return NextResponse.json({ success: true, message: "Resposta registada e enviada para análise da MARKA." }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "A resposta deve ter entre 20 e 2.000 caracteres." }, { status: 400 });
    console.error("[VENDOR_ORDER_QUALITY_RESPONSE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível registar a resposta." }, { status: 503 });
  }
}
