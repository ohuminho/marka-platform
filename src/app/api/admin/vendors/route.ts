import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  vendorId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]),
  reason: z.string().trim().max(2000).optional(),
});

async function authorize() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, isFounder: true },
  });
  if (!user || user.status !== "ACTIVE" || !(user.isFounder || ["ADMIN", "SUPER_ADMIN"].includes(user.role))) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem gerir lojas." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const vendors = await prisma.vendor.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } },
      store: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 250,
  });
  return NextResponse.json({
    vendors: vendors.map((vendor) => ({
      id: vendor.id, name: vendor.name, businessType: vendor.businessType, phone: vendor.phone,
      country: vendor.country, status: vendor.status, verified: vendor.verified,
      createdAt: vendor.createdAt.toISOString(), owner: vendor.owner,
      organization: vendor.organization, store: vendor.store,
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Decisão inválida.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { vendorId, status, reason } = parsed.data;
  if (status !== "ACTIVE" && !reason) return NextResponse.json({ message: "Indique o motivo da suspensão ou rejeição." }, { status: 422 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { store: true } });
  if (!vendor) return NextResponse.json({ message: "Candidatura de loja não encontrada." }, { status: 404 });

  if (status === "ACTIVE") {
    const subjectType = vendor.businessType === "COMPANY" ? "KYB" : "KYC";
    const subjectId = subjectType === "KYB" ? vendor.organizationId : vendor.ownerId;
    const profile = await prisma.complianceProfile.findFirst({
      where: { subjectType, subjectId, organizationId: subjectType === "KYB" ? vendor.organizationId : null },
      include: { documents: true },
      orderBy: { updatedAt: "desc" },
    });
    const now = new Date();
    const validEvidence = !!profile && profile.status === "VERIFIED" && profile.documents.length > 0 &&
      profile.documents.every((document) => document.status === "VERIFIED" && (!document.expiresAt || document.expiresAt > now));
    if (!validEvidence) return NextResponse.json({
      message: "A loja só pode ser ativada depois de a identidade ou documentação comercial estar verificada e válida no Centro de Conformidade.",
      code: "VENDOR_COMPLIANCE_INCOMPLETE",
    }, { status: 422 });
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({ where: { id: vendor.id }, data: { status, verified: status === "ACTIVE" } });
      if (vendor.store) {
        await tx.store.update({ where: { id: vendor.store.id }, data: { status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "INACTIVE" } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id, actorType: "ADMIN", organizationId: vendor.organizationId,
          action: status === "ACTIVE" ? "VENDOR_APPROVED" : status === "SUSPENDED" ? "VENDOR_SUSPENDED" : "VENDOR_REJECTED",
          entityType: "Vendor", entityId: vendor.id, ipAddress, userAgent,
          metadata: { status, reason: reason?.trim() || null, ownerId: vendor.ownerId, storeId: vendor.store?.id ?? null },
        },
      });
    });
    return NextResponse.json({ success: true, vendorId: vendor.id, status, message: status === "ACTIVE" ? "Loja aprovada e ativada." : status === "SUSPENDED" ? "Loja suspensa." : "Candidatura rejeitada." });
  } catch (error) {
    console.error("[MARKA_VENDOR_REVIEW]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível guardar a decisão." }, { status: 500 });
  }
}
