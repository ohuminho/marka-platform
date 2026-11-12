import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const bodySchema = z.object({
  status: z.enum([
    "PROVIDER_EN_ROUTE",
    "PROVIDER_ARRIVED",
    "PICKED_UP",
    "IN_TRANSIT",
    "COMPLETED",
    "EXCEPTION",
  ]),
});

const nextStatuses: Record<string, string[]> = {
  ASSIGNED: ["PROVIDER_EN_ROUTE", "EXCEPTION"],
  PROVIDER_EN_ROUTE: ["PROVIDER_ARRIVED", "EXCEPTION"],
  PROVIDER_ARRIVED: ["PICKED_UP", "COMPLETED", "EXCEPTION"],
  PICKED_UP: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["COMPLETED", "EXCEPTION"],
  EXCEPTION: ["PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "COMPLETED"],
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Estado do serviço inválido.", code: "INVALID_FREIGHT_STATUS" },
      { status: 400 },
    );
  }

  const provider = await prisma.freightProvider.findUnique({
    where: {
      organizationId_userId: {
        organizationId: auth.session.organizationId,
        userId: auth.session.userId,
      },
    },
  });
  if (!provider || provider.status !== "VERIFIED") {
    return NextResponse.json(
      { message: "Apenas prestadores verificados podem actualizar serviços.", code: "FREIGHT_PROVIDER_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.freightRequest.findFirst({
        where: {
          id,
          organizationId: auth.session.organizationId,
          assignedProviderId: provider.id,
        },
        select: { id: true, status: true, requestType: true, reference: true },
      });
      if (!current) throw new Error("FREIGHT_ASSIGNMENT_NOT_FOUND");

      const allowed = nextStatuses[current.status] ?? [];
      const requestedNext = parsed.data.status;
      const isRoadsideDirectCompletion =
        current.requestType === "ROADSIDE_ASSISTANCE" &&
        current.status === "PROVIDER_ARRIVED" &&
        requestedNext === "COMPLETED";

      if (!allowed.includes(requestedNext) || (requestedNext === "PICKED_UP" && current.requestType === "ROADSIDE_ASSISTANCE")) {
        if (!isRoadsideDirectCompletion) throw new Error("INVALID_FREIGHT_TRANSITION");
      }

      const changed = await tx.freightRequest.updateMany({
        where: {
          id: current.id,
          organizationId: auth.session.organizationId,
          assignedProviderId: provider.id,
          status: current.status,
        },
        data: {
          status: requestedNext,
        },
      });
      if (changed.count !== 1) throw new Error("FREIGHT_STATUS_CONFLICT");

      if (requestedNext === "COMPLETED") {
        const released = await tx.freightProvider.updateMany({
          where: { id: provider.id, availability: "BUSY" },
          data: { availability: "AVAILABLE" },
        });
        if (released.count !== 1) throw new Error("FREIGHT_PROVIDER_RELEASE_CONFLICT");
      }

      return tx.freightRequest.findUniqueOrThrow({
        where: { id: current.id },
        select: { id: true, reference: true, status: true, updatedAt: true },
      });
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_STATUS_UPDATE_FAILED";
    const conflict = code === "FREIGHT_STATUS_CONFLICT" || code === "FREIGHT_PROVIDER_RELEASE_CONFLICT";
    const notFound = code === "FREIGHT_ASSIGNMENT_NOT_FOUND";
    const invalid = code === "INVALID_FREIGHT_TRANSITION";
    return NextResponse.json(
      {
        message: notFound
          ? "Este serviço não está atribuído à sua conta."
          : invalid
            ? "Esta alteração não é permitida a partir do estado actual do serviço."
            : conflict
              ? "O estado do serviço mudou. Actualize os dados e tente novamente."
              : "Não foi possível actualizar o estado do serviço.",
        code,
      },
      { status: notFound ? 404 : invalid ? 409 : conflict ? 409 : 500 },
    );
  }
}
