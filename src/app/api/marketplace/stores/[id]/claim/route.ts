import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  claimantName: z.string().trim().min(2).max(120),
  claimantPhone: z.string().trim().min(6).max(40),
  claimantEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  businessType: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  reason: z.string().trim().min(20).max(2000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicie sessão para reivindicar esta loja." }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
    if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "A conta não está ativa." }, { status: 403 });

    const { id } = await context.params;
    const store = await prisma.store.findFirst({
      where: { id, status: "ACTIVE", vendor: { status: "ACTIVE" } },
      include: { vendor: { select: { ownerId: true } } },
    });
    if (!store) return NextResponse.json({ message: "Loja não encontrada ou indisponível." }, { status: 404 });
    if (store.vendor.ownerId === user.id) return NextResponse.json({ message: "Esta loja já está associada à sua conta." }, { status: 409 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Verifique os seus dados e explique como comprova a titularidade da loja.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

    const existing = await prisma.vendor.findFirst({ where: { ownerId: user.id }, select: { id: true } });
    if (existing) return NextResponse.json({ message: "A sua conta já gere outra loja. Contacte o suporte para evitar duplicação de perfis comerciais antes de pedir esta transferência.", code: "CLAIMANT_ALREADY_HAS_STORE" }, { status: 409 });

    const data = parsed.data;
    const claim = await prisma.storeClaimRequest.upsert({
      where: { storeId_claimantUserId: { storeId: store.id, claimantUserId: user.id } },
      create: {
        storeId: store.id, claimantUserId: user.id, claimantName: data.claimantName,
        claimantPhone: data.claimantPhone, claimantEmail: data.claimantEmail || null,
        businessType: data.businessType, reason: data.reason, status: "PENDING",
      },
      update: {
        claimantName: data.claimantName, claimantPhone: data.claimantPhone,
        claimantEmail: data.claimantEmail || null, businessType: data.businessType,
        reason: data.reason, status: "PENDING", reviewedBy: null, reviewedAt: null, decisionNote: null,
      },
    });
    return NextResponse.json({ success: true, claimId: claim.id, message: "Pedido recebido. A MARKA vai confirmar a titularidade antes de alterar o acesso à loja." }, { status: 201 });
  } catch (error) {
    console.error("[STORE_CLAIM_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível enviar o pedido de reivindicação." }, { status: 500 });
  }
}
