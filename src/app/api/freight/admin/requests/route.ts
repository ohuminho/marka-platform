import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { authorizationService } from "@/core/authorization/authorization.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  requestId: z.string().uuid(),
  amount: z.number().finite().positive().max(1_000_000_000_000),
  validityHours: z.number().int().min(1).max(72).default(24),
});
const exceptionReviewSchema = z.object({
  action: z.literal("REVIEW_EXCEPTION"),
  requestId: z.string().uuid(),
  note: z.string().trim().min(5).max(2000),
});

async function authorizeAdmin() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };

  const session = await new SessionService().validate(token);
  if (!session) return { error: NextResponse.json({ message: "Sessão inválida." }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, isFounder: true },
  });
  const requestHeaders = await headers();
  const organizationId = requestHeaders.get("x-organization-id")?.trim();

  if (!user || user.status !== "ACTIVE" || !organizationId) {
    return { error: NextResponse.json({ message: "É necessária uma sessão ativa com organização selecionada." }, { status: 403 }) };
  }

  const hasAdminAccess = user.isFounder || await authorizationService.hasPermission(
    user.id,
    "ADMIN_ACCESS",
    organizationId,
  );
  if (!hasAdminAccess) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem gerir cotações de carga." }, { status: 403 }) };
  }

  return { user, organizationId };
}

export async function GET() {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;

  const now = new Date();
  const requests = await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.organizationId,
      status: {
        in: [
          "REQUESTED", "QUOTED", "AWAITING_PAYMENT", "PAID",
          "SEARCHING_PROVIDER", "ASSIGNED", "PROVIDER_EN_ROUTE",
          "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT",
          "COMPLETED", "CANCELLED", "EXCEPTION",
        ],
      },
    },
    select: {
      id: true,
      reference: true,
      requestType: true,
      status: true,
      originAddress: true,
      destinationAddress: true,
      quantity: true,
      quantityUnit: true,
      currency: true,
      quotedAmount: true,
      quoteExpiresAt: true,
      paymentReference: true,
      paidAt: true,
      assignedProviderId: true,
      assignedVehicleId: true,
      assignedAt: true,
      createdAt: true,
      updatedAt: true,
      requester: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const exceptionEvents = requests.length > 0 ? await prisma.auditLog.findMany({
    where: {
      organizationId: auth.organizationId,
      entityType: "FreightRequest",
      entityId: { in: requests.map((item) => item.id) },
      action: "FREIGHT_STATUS_EXCEPTION",
    },
    select: { entityId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  }) : [];
  const exceptionReviewEvents = requests.length > 0 ? await prisma.auditLog.findMany({
    where: {
      organizationId: auth.organizationId,
      entityType: "FreightRequest",
      entityId: { in: requests.map((item) => item.id) },
      action: "FREIGHT_EXCEPTION_REVIEWED",
    },
    select: { entityId: true, metadata: true, createdAt: true, actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  }) : [];
  const latestExceptionReviewByRequest = new Map<string, { note: string; reviewedAt: string; reviewedBy: string | null }>();
  for (const event of exceptionReviewEvents) {
    if (!event.entityId || latestExceptionReviewByRequest.has(event.entityId)) continue;
    const metadata = event.metadata && typeof event.metadata === "object"
      ? event.metadata as Record<string, unknown>
      : {};
    latestExceptionReviewByRequest.set(event.entityId, {
      note: typeof metadata.note === "string" ? metadata.note : "Ocorrência analisada.",
      reviewedAt: event.createdAt.toISOString(),
      reviewedBy: event.actor?.name ?? null,
    });
  }

  const latestExceptionByRequest = new Map<string, { note: string | null; createdAt: string }>();
  for (const event of exceptionEvents) {
    if (!event.entityId || latestExceptionByRequest.has(event.entityId)) continue;
    const metadata = event.metadata && typeof event.metadata === "object"
      ? event.metadata as Record<string, unknown>
      : {};
    latestExceptionByRequest.set(event.entityId, {
      note: typeof metadata.note === "string" ? metadata.note : null,
      createdAt: event.createdAt.toISOString(),
    });
  }

  return NextResponse.json({
    requests: requests.map((item) => ({
      ...item,
      latestException: latestExceptionByRequest.get(item.id) ?? null,
      latestExceptionReview: (() => {
        const exception = latestExceptionByRequest.get(item.id);
        const review = latestExceptionReviewByRequest.get(item.id);
        return exception && review && review.reviewedAt > exception.createdAt ? review : null;
      })(),
      quantity: item.quantity === null ? null : Number(item.quantity),
      quotedAmount: item.quotedAmount === null ? null : Number(item.quotedAmount),
      quoteExpiresAt: item.quoteExpiresAt?.toISOString() ?? null,
      quoteExpired: item.quoteExpiresAt ? item.quoteExpiresAt <= now : false,
      paidAt: item.paidAt?.toISOString() ?? null,
      assignedAt: item.assignedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = z.union([quoteSchema, exceptionReviewSchema]).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      message: "Dados inválidos. Verifique o valor da cotação ou a descrição da análise.",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  if ("action" in parsed.data && parsed.data.action === "REVIEW_EXCEPTION") {
    const { requestId, note } = parsed.data;
    const requestHeaders = await headers();
    const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
    const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
    try {
      const reviewed = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "FreightRequest"
          WHERE "id" = ${requestId}
            AND "organizationId" = ${auth.organizationId}
            AND "status"::text = 'EXCEPTION'
          FOR UPDATE
        `;
        if (locked.length !== 1) return false;
        const current = await tx.freightRequest.findFirst({
          where: { id: requestId, organizationId: auth.organizationId, status: "EXCEPTION" },
          select: { id: true, reference: true, assignedProviderId: true, assignedVehicleId: true },
        });
        if (!current) return false;
        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            actorType: "ADMIN",
            organizationId: auth.organizationId,
            action: "FREIGHT_EXCEPTION_REVIEWED",
            entityType: "FreightRequest",
            entityId: requestId,
            ipAddress,
            userAgent,
            metadata: {
              reference: current.reference,
              note,
              assignedProviderId: current.assignedProviderId,
              assignedVehicleId: current.assignedVehicleId,
              reviewedAt: new Date().toISOString(),
            },
          },
        });
        return true;
      });
      if (!reviewed) {
        return NextResponse.json({
          message: "A ocorrência já não está pendente ou o pedido não existe.",
          code: "FREIGHT_EXCEPTION_NOT_REVIEWABLE",
        }, { status: 409 });
      }
      return NextResponse.json({ success: true, requestId, reviewed: true });
    } catch (error) {
      console.error("[MARKA_FREIGHT_EXCEPTION_REVIEW]", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ message: "Não foi possível registar a análise da ocorrência." }, { status: 500 });
    }
  }

  const { requestId, amount, validityHours } = parsed.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
  const freightMeta = await prisma.freightRequest.findFirst({
    where: { id: requestId, organizationId: auth.organizationId },
    select: { currency: true },
  });
  if (!freightMeta) {
    return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.freightRequest.updateMany({
        where: {
          id: requestId,
          organizationId: auth.organizationId,
          OR: [
            { status: "REQUESTED" },
            { status: "QUOTED", quoteExpiresAt: { lte: now } },
          ],
        },
        data: {
          quotedAmount: amount,
          quoteExpiresAt: expiresAt,
          status: "QUOTED",
        },
      });

      if (updated.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actorType: "ADMIN",
          organizationId: auth.organizationId,
          action: "FREIGHT_QUOTE_ISSUED",
          entityType: "FreightRequest",
          entityId: requestId,
          ipAddress,
          userAgent,
          metadata: {
            amount,
            currency: freightMeta.currency,
            validityHours,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return true;
    });

    if (!result) {
      return NextResponse.json({
        message: "O pedido já não está disponível para cotação ou a cotação atual ainda está válida.",
        code: "FREIGHT_QUOTE_CONFLICT",
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      requestId,
      amount,
      currency: freightMeta.currency,
      quoteExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[MARKA_FREIGHT_QUOTE]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível registar a cotação." }, { status: 500 });
  }
}
