import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function authenticatedUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  return user?.status === "ACTIVE" ? user : null;
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const requests = await prisma.privateServiceRequest.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, reference: true, serviceType: true, specialty: true, title: true,
        summary: true, region: true, status: true, createdAt: true, expiresAt: true,
        offers: { select: { id: true, status: true, createdAt: true, professional: { select: { publicName: true, region: true } } } },
      },
    });
    return NextResponse.json({ items: requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICES_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar os pedidos privados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || body.consent !== true) {
      return NextResponse.json({ message: "É necessário consentimento expresso para encaminhar o pedido." }, { status: 400 });
    }

    const serviceType = typeof body.serviceType === "string" ? body.serviceType.trim().toUpperCase() : "";
    const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : null;
    if (!["LEGAL", "PSYCHOLOGY"].includes(serviceType) ||
        !specialty || specialty.length > 100 ||
        !title || title.length > 120 ||
        !summary || summary.length < 20 || summary.length > 5000 ||
        (region !== null && region.length > 100)) {
      return NextResponse.json({ message: "Dados do pedido inválidos. Verifica a especialidade, o título e o resumo." }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const reference = `MPS-${now.getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const professionals = await tx.privateProfessionalProfile.findMany({
        where: {
          status: "VERIFIED",
          verifiedAt: { not: null },
          specialties: { has: specialty },
          user: { status: "ACTIVE" },
          ...(region ? { OR: [{ region }, { region: null }] } : {}),
        },
        select: { id: true, userId: true },
        orderBy: { createdAt: "asc" },
        take: 8,
      });

      const created = await tx.privateServiceRequest.create({
        data: {
          reference, requesterId: user.id, serviceType, specialty, title, summary,
          region: region || null, consentAt: now, consentVersion: "private-services-v1", expiresAt,
          status: professionals.length ? "OFFERED" : "MATCHING",
        },
        select: { id: true, reference: true, status: true, specialty: true },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "PRIVATE_SERVICE_SUBMITTED",
          title: "Pedido privado recebido",
          message: professionals.length
            ? "O teu pedido foi encaminhado a profissionais verificados. Vais receber uma notificação quando houver respostas."
            : "O teu pedido foi recebido. A MARKA está à procura de profissionais elegíveis.",
          data: { requestId: created.id, reference: created.reference },
        },
      });

      if (professionals.length) {
        await tx.privateServiceOffer.createMany({
          data: professionals.map((professional) => ({
            requestId: created.id, professionalId: professional.id, expiresAt,
          })),
        });
        const offers = await tx.privateServiceOffer.findMany({
          where: { requestId: created.id },
          select: { id: true, professionalId: true },
        });
        const userByProfile = new Map(professionals.map((professional) => [professional.id, professional.userId]));
        await tx.notification.createMany({
          data: offers.map((offer) => ({
            userId: userByProfile.get(offer.professionalId)!,
            type: "PRIVATE_SERVICE_OFFER",
            title: "Novo pedido privado",
            message: `Novo pedido de ${specialty} disponível para análise.`,
            data: { requestId: created.id, offerId: offer.id, reference: created.reference },
          })),
        });
      }
      return { request: created, invitedCount: professionals.length };
    });

    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICES_CREATE]", error);
    return NextResponse.json({ message: "Não foi possível encaminhar o pedido privado." }, { status: 500 });
  }
}
