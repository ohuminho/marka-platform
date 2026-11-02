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
      owner: { select: { id: true, name: true, email: true, phoneVerifiedAt: true } },
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
      createdAt: vendor.createdAt.toISOString(),
      owner: { ...vendor.owner, phoneVerified: Boolean(vendor.owner.phoneVerifiedAt), phoneVerifiedAt: undefined },
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

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { store: true, owner: { select: { id: true, phoneVerifiedAt: true } } },
  });
  if (!vendor) return NextResponse.json({ message: "Candidatura de loja não encontrada." }, { status: 404 });

  let identityLevel: "BUSINESS_VERIFIED" | "IDENTITY_VERIFIED" | "LIMITED_PHONE_VERIFIED" | null = null;
  if (status === "ACTIVE") {
    const isCompany = vendor.businessType === "COMPANY";
    const subjectType = isCompany ? "KYB" : "KYC";
    const subjectId = isCompany ? vendor.organizationId : vendor.ownerId;
    const profile = await prisma.complianceProfile.findFirst({
      where: { subjectType, subjectId, organizationId: isCompany ? vendor.organizationId : null },
      include: { documents: true },
      orderBy: { updatedAt: "desc" },
    });
    const now = new Date();
    const validEvidence = Boolean(profile &&
      profile.status === "VERIFIED" &&
      (!profile.expiresAt || profile.expiresAt > now) &&
      profile.documents.length > 0 &&
      profile.documents.every((document) =>
        document.status === "VERIFIED" &&
        (!document.expiresAt || document.expiresAt > now)
      ));

    if (isCompany && !validEvidence) {
      return NextResponse.json({
        message: "Uma empresa só pode ser ativada depois da verificação KYB e da documentação comercial válida.",
        code: "VENDOR_KYB_REQUIRED",
      }, { status: 422 });
    }

    if (isCompany) {
      identityLevel = "BUSINESS_VERIFIED";
    } else if (validEvidence) {
      identityLevel = "IDENTITY_VERIFIED";
    } else if (vendor.owner.phoneVerifiedAt) {
      // Human approval is allowed for individual micro-sellers, but this is not civil-identity verification.
      identityLevel = "LIMITED_PHONE_VERIFIED";
    } else {
      return NextResponse.json({
        message: "Para aprovar um vendedor individual sem BI, confirma primeiro o telefone da conta. A aprovação será limitada e não atribuirá selo de identidade verificada.",
        code: "VENDOR_PHONE_VERIFICATION_REQUIRED",
      }, { status: 422 });
    }
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          status,
          // A phone-verified individual seller is not represented as civil-identity verified.
          verified: status === "ACTIVE" && identityLevel !== "LIMITED_PHONE_VERIFIED",
        },
      });
      if (vendor.store) {
        await tx.store.update({
          where: { id: vendor.store.id },
          data: { status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "INACTIVE" },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id, actorType: "ADMIN", organizationId: vendor.organizationId,
          action: status === "ACTIVE" ? "VENDOR_APPROVED" : status === "SUSPENDED" ? "VENDOR_SUSPENDED" : "VENDOR_REJECTED",
          entityType: "Vendor", entityId: vendor.id, ipAddress, userAgent,
          metadata: {
            status, reason: reason?.trim() || null, ownerId: vendor.ownerId,
            storeId: vendor.store?.id ?? null, verificationLevel: identityLevel,
            approvalMode: identityLevel === "LIMITED_PHONE_VERIFIED" ? "HUMAN_REVIEW_LIMITED" : "DOCUMENT_VERIFIED",
          },
        },
      });
    });
    const message = status !== "ACTIVE"
      ? status === "SUSPENDED" ? "Loja suspensa." : "Candidatura rejeitada."
      : identityLevel === "LIMITED_PHONE_VERIFIED"
        ? "Loja aprovada com verificação limitada por revisão humana. Não recebe selo de identidade verificada."
        : "Loja aprovada e ativada com documentação verificada.";
    return NextResponse.json({ success: true, vendorId: vendor.id, status, verificationLevel: identityLevel, message });
  } catch (error) {
    console.error("[MARKA_VENDOR_REVIEW]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível guardar a decisão." }, { status: 500 });
  }
}
