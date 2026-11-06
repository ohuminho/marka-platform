import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

async function authorize() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, status: true, isFounder: true } });
  if (!user || user.status !== "ACTIVE" || !(user.isFounder || ["ADMIN", "SUPER_ADMIN"].includes(user.role))) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem rever reivindicações." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const claims = await prisma.storeClaimRequest.findMany({
    include: {
      store: { select: { id: true, name: true, vendor: { select: { id: true, ownerId: true, name: true } } } },
      claimant: { select: { id: true, name: true, email: true, phoneVerifiedAt: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 250,
  });
  return NextResponse.json({
    claims: claims.map((claim) => ({
      id: claim.id, store: claim.store, claimant: { ...claim.claimant, phoneVerified: Boolean(claim.claimant.phoneVerifiedAt), phoneVerifiedAt: undefined },
      claimantName: claim.claimantName, claimantPhone: claim.claimantPhone, claimantEmail: claim.claimantEmail,
      businessType: claim.businessType, reason: claim.reason, status: claim.status,
      decisionNote: claim.decisionNote, createdAt: claim.createdAt.toISOString(),
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

const decisionSchema = z.object({
  claimId: z.string().uuid(),
  action: z.enum(["APPROVE", "REJECT"]),
  decisionNote: z.string().trim().max(2000).optional().default(""),
});

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Decisão inválida.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  const claim = await prisma.storeClaimRequest.findUnique({
    where: { id: parsed.data.claimId },
    include: { store: { include: { vendor: true } }, claimant: { select: { id: true } } },
  });
  if (!claim || claim.status !== "PENDING") return NextResponse.json({ message: "Pedido não encontrado ou já analisado." }, { status: 404 });

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.action === "APPROVE") {
        const existingVendor = await tx.vendor.findFirst({ where: { ownerId: claim.claimantUserId }, select: { id: true } });
        if (existingVendor && existingVendor.id !== claim.store.vendor.id) {
          throw new Error("CLAIMANT_ALREADY_HAS_VENDOR");
        }

        const tenant = await tx.tenant.findUnique({ where: { key: "marka" }, select: { id: true } });
        if (!tenant) throw new Error("MARKA tenant is not initialized.");
        const isCompany = claim.businessType === "COMPANY";
        const slug = `store-claim-${claim.claimantUserId}`;
        const organization = await tx.organization.upsert({
          where: { slug },
          update: { name: claim.store.name, tenantId: tenant.id, type: isCompany ? "BUSINESS" : "VENDOR", status: "ACTIVE" },
          create: { tenantId: tenant.id, name: claim.store.name, slug, type: isCompany ? "BUSINESS" : "VENDOR", status: "ACTIVE" },
          select: { id: true },
        });
        await tx.organizationMembership.upsert({
          where: { organizationId_userId: { organizationId: organization.id, userId: claim.claimantUserId } },
          update: { status: "ACTIVE" },
          create: { organizationId: organization.id, userId: claim.claimantUserId, status: "ACTIVE" },
        });
        await tx.vendor.update({
          where: { id: claim.store.vendor.id },
          data: { ownerId: claim.claimantUserId, organizationId: organization.id, businessType: claim.businessType, status: "ACTIVE", verified: false },
        });
        await tx.store.update({ where: { id: claim.storeId }, data: { status: "ACTIVE" } });
      }

      await tx.storeClaimRequest.update({
        where: { id: claim.id },
        data: {
          status: parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewedBy: auth.user.id, reviewedAt: new Date(), decisionNote: parsed.data.decisionNote || null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id, actorType: "ADMIN", organizationId: claim.store.vendor.organizationId,
          action: parsed.data.action === "APPROVE" ? "STORE_OWNERSHIP_TRANSFERRED" : "STORE_CLAIM_REJECTED",
          entityType: "Store", entityId: claim.storeId, ipAddress, userAgent,
          metadata: { claimId: claim.id, claimantUserId: claim.claimantUserId, decisionNote: parsed.data.decisionNote || null },
        },
      });
    });
    return NextResponse.json({
      success: true,
      status: parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED",
      message: parsed.data.action === "APPROVE" ? "Titularidade transferida. A loja continua pública e sem selo Verified até concluir a verificação." : "Pedido de reivindicação rejeitado.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLAIMANT_ALREADY_HAS_VENDOR") {
      return NextResponse.json({ message: "O requerente já administra outra loja. É necessária uma operação assistida de consolidação antes de transferir a titularidade.", code: "CLAIMANT_ALREADY_HAS_VENDOR" }, { status: 409 });
    }
    console.error("[STORE_CLAIM_REVIEW]", error);
    return NextResponse.json({ message: "Não foi possível concluir a revisão do pedido." }, { status: 500 });
  }
}
