import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { privateServiceProposalSchema } from "@/core/private-services/proposal.schema";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string; offerId: string }> },
) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const { requestId, offerId } = await context.params;
    const parsed = privateServiceProposalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Dados da resposta inválidos.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const body = parsed.data;
    if (body.action === "ACCEPT" && (body.proposedFeeKz === undefined || !body.proposalAvailability || !body.proposalApproach)) {
      return NextResponse.json({ message: "Para manifestar interesse, indica o honorário em Kz, disponibilidade e abordagem profissional." }, { status: 422 });
    }

    const profile = await prisma.privateProfessionalProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "VERIFIED") {
      return NextResponse.json({ message: "Perfil profissional verificado necessário." }, { status: 403 });
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.privateServiceOffer.findFirst({
        where: { id: offerId, requestId, professionalId: profile.id },
        select: {
          id: true, status: true, expiresAt: true,
          request: { select: { id: true, reference: true, requesterId: true, status: true, expiresAt: true } },
        },
      });
      if (!offer) return { error: "NOT_FOUND" as const };
      if (offer.status !== "PENDING" || offer.expiresAt <= now || offer.request.expiresAt <= now ||
          !["OFFERED", "MATCHING", "IN_REVIEW"].includes(offer.request.status)) {
        return { error: "CONFLICT" as const };
      }

      const updated = await tx.privateServiceOffer.updateMany({
        where: {
          id: offer.id,
          professionalId: profile.id,
          status: "PENDING",
          expiresAt: { gt: now },
          request: {
            is: {
              status: { in: ["OFFERED", "MATCHING", "IN_REVIEW"] },
              expiresAt: { gt: now },
            },
          },
        },
        data: {
          status: body.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
          respondedAt: now,
          ...(body.action === "ACCEPT" ? {
            proposedFeeKz: body.proposedFeeKz!,
            proposalAvailability: body.proposalAvailability!,
            proposalApproach: body.proposalApproach!,
            proposalSubmittedAt: now,
          } : {}),
        },
      });
      if (updated.count !== 1) return { error: "CONFLICT" as const };

      if (body.action === "ACCEPT") {
        await tx.privateServiceRequest.updateMany({
          where: { id: requestId, status: { in: ["OFFERED", "MATCHING"] } },
          data: { status: "IN_REVIEW" },
        });
        await tx.notification.create({
          data: {
            userId: offer.request.requesterId,
            type: "PRIVATE_SERVICE_INTEREST",
            title: "Um profissional respondeu ao teu pedido",
            message: "Um profissional verificado manifestou interesse. Podes acompanhar as respostas na MARKA.",
            data: { requestId, reference: offer.request.reference },
          },
        });
      }
      return { success: true as const, status: body.action === "ACCEPT" ? "ACCEPTED" : "DECLINED" };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") return NextResponse.json({ message: "Convite não encontrado." }, { status: 404 });
      return NextResponse.json({ message: "Este convite já foi respondido ou expirou." }, { status: 409 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICE_OFFER_RESPONSE]", error);
    return NextResponse.json({ message: "Não foi possível responder ao convite." }, { status: 500 });
  }
}
