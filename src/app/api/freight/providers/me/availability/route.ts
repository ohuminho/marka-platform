import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import { resolveRequestedFreightAvailability } from "@/freight-engine/freight-provider-availability";

const availabilitySchema = z.object({
  availability: z.enum(["AVAILABLE", "OFFLINE", "PAUSED"]),
});

const activeAssignmentStatuses = [
  "ASSIGNED",
  "PROVIDER_EN_ROUTE",
  "PROVIDER_ARRIVED",
  "PICKED_UP",
  "IN_TRANSIT",
  "EXCEPTION",
] as const;

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

  const result = await prisma.$transaction(async (tx) => {
    // Use the same lock order as freight assignment: advisory lock, then provider row.
    // This prevents an availability update from overwriting BUSY after a concurrent assignment.
    const providerIdentity = await tx.freightProvider.findUnique({
      where: {
        organizationId_userId: {
          organizationId: auth.session.organizationId,
          userId: auth.session.userId,
        },
      },
      select: { id: true },
    });

    if (!providerIdentity) return { ok: false as const, reason: "NOT_FOUND" as const };

    await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${providerIdentity.id}))`;

    const lockedProvider = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "FreightProvider"
      WHERE "id" = ${providerIdentity.id}
        AND "organizationId" = ${auth.session.organizationId}
        AND "userId" = ${auth.session.userId}
      FOR UPDATE
    `;
    if (lockedProvider.length !== 1) return { ok: false as const, reason: "NOT_FOUND" as const };

    const provider = await tx.freightProvider.findFirst({
      where: {
        id: providerIdentity.id,
        organizationId: auth.session.organizationId,
        userId: auth.session.userId,
      },
      select: { id: true, status: true },
    });
    if (!provider) return { ok: false as const, reason: "NOT_FOUND" as const };

    let activeAssignments = 0;
    if (parsed.data.availability === "AVAILABLE") {
      if (provider.status !== "VERIFIED") {
        return { ok: false as const, reason: "NOT_VERIFIED" as const };
      }

      const activeVehicles = await tx.freightProviderVehicle.count({
        where: { providerId: provider.id, status: "ACTIVE" },
      });
      if (activeVehicles === 0) {
        return { ok: false as const, reason: "ACTIVE_VEHICLE_REQUIRED" as const };
      }

      activeAssignments = await tx.freightRequest.count({
        where: {
          organizationId: auth.session.organizationId,
          assignedProviderId: provider.id,
          status: { in: [...activeAssignmentStatuses] },
        },
      });
    }

    const availability = resolveRequestedFreightAvailability(
      parsed.data.availability,
      activeAssignments,
    );

    const updated = await tx.freightProvider.update({
      where: { id: provider.id },
      data: { availability },
      select: {
        id: true,
        status: true,
        availability: true,
        updatedAt: true,
      },
    });

    return { ok: true as const, provider: updated };
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json(
        { message: "Prestador não encontrado.", code: "FREIGHT_PROVIDER_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (result.reason === "NOT_VERIFIED") {
      return NextResponse.json(
        {
          message: "A disponibilidade só pode ser activada após a verificação do prestador.",
          code: "FREIGHT_PROVIDER_NOT_VERIFIED",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        message: "Registe e obtenha aprovação de pelo menos uma viatura antes de ficar disponível.",
        code: "ACTIVE_FREIGHT_VEHICLE_REQUIRED",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ provider: result.provider });
}
