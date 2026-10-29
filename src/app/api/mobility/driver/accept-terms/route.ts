import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const DRIVER_TERMS_VERSION = "MARKA-MOBILITY-DRIVER-2026-10-29";

export async function POST(request: Request) {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return NextResponse.json({ message: "Autenticação necessária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const session = await new SessionService().validate(token);
  if (!session) return NextResponse.json({ message: "Sessão inválida ou expirada.", code: "INVALID_SESSION" }, { status: 401 });

  let body: { accepted?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Pedido inválido." }, { status: 400 }); }
  if (body.accepted !== true) return NextResponse.json({ message: "É necessário assinalar a aceitação expressa dos termos." , code: "EXPLICIT_ACCEPTANCE_REQUIRED" }, { status: 422 });

  const organizationId = request.headers.get("X-Organization-Id")?.trim();
  if (!organizationId) return NextResponse.json({ message: "Seleciona a organização MARKA.", code: "ORGANIZATION_ID_REQUIRED" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "A conta MARKA deve estar ativa.", code: "USER_NOT_ACTIVE" }, { status: 403 });
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: user.id, organizationId, status: "ACTIVE", organization: { status: "ACTIVE" } },
    select: { organizationId: true },
  });
  if (!membership) return NextResponse.json({ message: "Acesso à organização negado.", code: "ORGANIZATION_ACCESS_DENIED" }, { status: 403 });

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  const acceptedAt = new Date();
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorType: "USER",
      organizationId,
      action: "MOBILITY_DRIVER_TERMS_ACCEPTED",
      entityType: "MobilityDriverTerms",
      entityId: DRIVER_TERMS_VERSION,
      ipAddress: forwardedFor?.slice(0, 64) ?? null,
      userAgent,
      metadata: {
        version: DRIVER_TERMS_VERSION,
        acceptedAt: acceptedAt.toISOString(),
        acceptanceMethod: "explicit-checkbox",
        documentTitle: "Termos de Adesão do Motorista Parceiro MARKA Mobility",
      },
    },
  });

  return NextResponse.json({ accepted: true, version: DRIVER_TERMS_VERSION, acceptedAt: acceptedAt.toISOString() }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
