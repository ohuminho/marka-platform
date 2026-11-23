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

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { requestId } = await context.params;
    const serviceRequest = await prisma.privateServiceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true, reference: true, requesterId: true, serviceType: true,
        specialty: true, title: true, summary: true, region: true, status: true,
        selectedProfessionalId: true, createdAt: true,
      },
    });
    if (!serviceRequest) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });

    const isRequester = serviceRequest.requesterId === user.id;
    const profile = !isRequester
      ? await prisma.privateProfessionalProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } })
      : null;
    const isSelectedProfessional = Boolean(
      profile && profile.status === "VERIFIED" && serviceRequest.selectedProfessionalId === profile.id &&
      ["PROFESSIONAL_SELECTED", "ENGAGED"].includes(serviceRequest.status),
    );
    if (!isRequester && !isSelectedProfessional) {
      return NextResponse.json({ message: "Sem autorização para consultar os detalhes confidenciais." }, { status: 403 });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorType: "USER",
        action: "PRIVATE_SERVICE_CASE_VIEWED",
        entityType: "PrivateServiceRequest",
        entityId: serviceRequest.id,
        metadata: { accessRole: isRequester ? "REQUESTER" : "SELECTED_PROFESSIONAL" },
      },
    });

    return NextResponse.json({
      request: {
        id: serviceRequest.id, reference: serviceRequest.reference,
        serviceType: serviceRequest.serviceType, specialty: serviceRequest.specialty,
        title: serviceRequest.title, summary: serviceRequest.summary,
        region: serviceRequest.region, status: serviceRequest.status,
        createdAt: serviceRequest.createdAt,
      },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICE_DETAIL]", error);
    return NextResponse.json({ message: "Não foi possível carregar o pedido privado." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { requestId } = await context.params;
    const body = await request.json().catch(() => null) as { action?: unknown; offerId?: unknown } | null;

    if (body?.action === "ACCEPT_PROPOSAL") {
      const result = await prisma.$transaction(async (tx) => {
        const serviceRequest = await tx.privateServiceRequest.findFirst({
          where: { id: requestId, requesterId: user.id, status: "PROFESSIONAL_SELECTED", selectedProfessionalId: { not: null } },
          select: { id: true, reference: true, selectedProfessionalId: true },
        });
        if (!serviceRequest?.selectedProfessionalId) return { error: "REQUEST_UNAVAILABLE" as const };

        const offer = await tx.privateServiceOffer.findFirst({
          where: {
            requestId,
            professionalId: serviceRequest.selectedProfessionalId,
            status: "SELECTED",
            proposedFeeKz: { not: null },
            proposalAvailability: { not: null },
            proposalApproach: { not: null },
            professional: { is: { status: "VERIFIED", user: { is: { status: "ACTIVE" } } } },
          },
          select: {
            id: true, proposedFeeKz: true, proposalAvailability: true, proposalApproach: true,
            professional: { select: { userId: true, publicName: true } },
          },
        });
        if (!offer || offer.proposedFeeKz === null || !offer.proposalAvailability || !offer.proposalApproach) {
          return { error: "PROPOSAL_UNAVAILABLE" as const };
        }

        const changed = await tx.privateServiceRequest.updateMany({
          where: { id: requestId, requesterId: user.id, status: "PROFESSIONAL_SELECTED", selectedProfessionalId: serviceRequest.selectedProfessionalId },
          data: { status: "ENGAGED" },
        });
        if (changed.count !== 1) return { error: "REQUEST_UNAVAILABLE" as const };

        const acceptedAt = new Date();
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            actorType: "USER",
            action: "PRIVATE_SERVICE_PROPOSAL_ACCEPTED",
            entityType: "PrivateServiceRequest",
            entityId: requestId,
            metadata: {
              reference: serviceRequest.reference,
              offerId: offer.id,
              professionalId: serviceRequest.selectedProfessionalId,
              agreedFeeKz: offer.proposedFeeKz,
              acceptedAt: acceptedAt.toISOString(),
              proposalVersion: "private-service-proposal-v1",
              legalContractStatus: "NOT_CREATED",
            },
          },
        });
        await tx.notification.create({
          data: {
            userId: offer.professional.userId,
            type: "PRIVATE_SERVICE_ENGAGED",
            title: "Proposta aceite pelo cliente",
            message: "O cliente aceitou a tua proposta. O acompanhamento pode agora ser iniciado através do processo privado.",
            data: { requestId, reference: serviceRequest.reference },
          },
        });
        return { success: true as const, status: "ENGAGED" as const };
      });

      if ("error" in result) {
        return NextResponse.json({
          message: result.error === "PROPOSAL_UNAVAILABLE"
            ? "A proposta seleccionada já não está disponível."
            : "Este pedido já não pode aceitar propostas.",
        }, { status: 409 });
      }
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    if (body?.action !== "SELECT_PROFESSIONAL" ||
        typeof body.offerId !== "string" || body.offerId.length > 128) {
      return NextResponse.json({ message: "Acção ou selecção de profissional inválida." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const serviceRequest = await tx.privateServiceRequest.findFirst({
        where: { id: requestId, requesterId: user.id, status: "IN_REVIEW", selectedProfessionalId: null },
        select: { id: true, reference: true },
      });
      if (!serviceRequest) return { error: "REQUEST_UNAVAILABLE" as const };

      const selectedOffer = await tx.privateServiceOffer.findFirst({
        where: { id: body.offerId as string, requestId, status: "ACCEPTED", professional: { is: { status: "VERIFIED", user: { is: { status: "ACTIVE" } } } } },
        select: { id: true, professionalId: true, professional: { select: { userId: true } } },
      });
      if (!selectedOffer) return { error: "OFFER_UNAVAILABLE" as const };

      const otherOffers = await tx.privateServiceOffer.findMany({
        where: { requestId, id: { not: selectedOffer.id }, status: { in: ["PENDING", "ACCEPTED"] } },
        select: { id: true, professional: { select: { userId: true } } },
      });
      const changed = await tx.privateServiceRequest.updateMany({
        where: { id: requestId, requesterId: user.id, status: "IN_REVIEW", selectedProfessionalId: null },
        data: { status: "PROFESSIONAL_SELECTED", selectedProfessionalId: selectedOffer.professionalId },
      });
      if (changed.count !== 1) return { error: "REQUEST_UNAVAILABLE" as const };

      await tx.privateServiceOffer.update({ where: { id: selectedOffer.id }, data: { status: "SELECTED" } });
      await tx.privateServiceOffer.updateMany({
        where: { requestId, id: { not: selectedOffer.id }, status: { in: ["PENDING", "ACCEPTED"] } },
        data: { status: "WITHDRAWN", respondedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: selectedOffer.professional.userId,
          type: "PRIVATE_SERVICE_SELECTED",
          title: "Foste seleccionado para um pedido privado",
          message: "O cliente escolheu-te. O pedido confidencial está agora disponível na MARKA.",
          data: { requestId, reference: serviceRequest.reference },
        },
      });
      if (otherOffers.length) {
        await tx.notification.createMany({
          data: otherOffers.map((offer) => ({
            userId: offer.professional.userId,
            type: "PRIVATE_SERVICE_CLOSED",
            title: "Pedido privado atribuído",
            message: "O cliente seleccionou outro profissional para este pedido.",
            data: { requestId, reference: serviceRequest.reference },
          })),
        });
      }
      return { success: true as const, status: "PROFESSIONAL_SELECTED" as const };
    });

    if ("error" in result) {
      return NextResponse.json({
        message: result.error === "OFFER_UNAVAILABLE"
          ? "O profissional já não está disponível para selecção."
          : "O pedido já foi atribuído ou não pertence à tua conta.",
      }, { status: 409 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICE_LIFECYCLE]", error);
    return NextResponse.json({ message: "Não foi possível actualizar o processo privado." }, { status: 500 });
  }
}
