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

  const requests = await prisma.freightRequest.findMany({
    where: {
      organizationId: auth.organizationId,
      status: { in: ["REQUESTED", "QUOTED", "AWAITING_PAYMENT"] },
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
      createdAt: true,
      requester: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    requests: requests.map((item) => ({
      ...item,
      quantity: item.quantity === null ? null : Number(item.quantity),
      quotedAmount: item.quotedAmount === null ? null : Number(item.quotedAmount),
      quoteExpiresAt: item.quoteExpiresAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      message: "A cotação deve conter um valor válido e uma validade entre 1 e 72 horas.",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { requestId, amount, validityHours } = parsed.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
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
          metadata: { amount, currency: "AOA", validityHours, expiresAt: expiresAt.toISOString() },
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
      currency: "AOA",
      quoteExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[MARKA_FREIGHT_QUOTE]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível registar a cotação." }, { status: 500 });
  }
}
