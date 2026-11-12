import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const availabilitySchema = z.object({
  availability: z.enum(["AVAILABLE", "OFFLINE", "PAUSED"]),
});

export async function PUT(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corpo do pedido inválido.", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Estado de disponibilidade inválido.",
        code: "INVALID_FREIGHT_AVAILABILITY",
        errors: parsed.error.flatten().fieldErrors,
      },
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
    include: {
      vehicles: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  if (!provider) {
    return NextResponse.json(
      { message: "Prestador não encontrado.", code: "FREIGHT_PROVIDER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (parsed.data.availability === "AVAILABLE") {
    if (provider.status !== "VERIFIED") {
      return NextResponse.json(
        {
          message: "A disponibilidade só pode ser activada após a verificação do prestador.",
          code: "FREIGHT_PROVIDER_NOT_VERIFIED",
        },
        { status: 409 },
      );
    }

    if (provider.vehicles.length === 0) {
      return NextResponse.json(
        {
          message: "Registe e obtenha aprovação de pelo menos uma viatura antes de ficar disponível.",
          code: "ACTIVE_FREIGHT_VEHICLE_REQUIRED",
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.freightProvider.update({
    where: { id: provider.id },
    data: { availability: parsed.data.availability },
    select: {
      id: true,
      status: true,
      availability: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ provider: updated });
}
