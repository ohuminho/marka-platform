import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import { shouldReleaseFreightProvider } from "@/freight-engine/freight-provider-availability";

const bodySchema = z.object({
  status: z.enum([
    "PROVIDER_EN_ROUTE",
    "PROVIDER_ARRIVED",
    "PICKED_UP",
    "IN_TRANSIT",
    "COMPLETED",
    "EXCEPTION",
  ]),
  note: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  if (value.status === "EXCEPTION" && !value.note) {
    context.addIssue({
      code: "custom",
      path: ["note"],
      message: "Descreva a ocorrência antes de a registar.",
    });
  }
});

const nextStatuses: Record<string, string[]> = {
  ASSIGNED: ["PROVIDER_EN_ROUTE", "EXCEPTION"],
  PROVIDER_EN_ROUTE: ["PROVIDER_ARRIVED", "EXCEPTION"],
  PROVIDER_ARRIVED: ["PICKED_UP", "COMPLETED", "EXCEPTION"],
  PICKED_UP: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["COMPLETED", "EXCEPTION"],
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
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${provider.id}))`;
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
      const persistedNextStatus = requestedNext === "COMPLETED"
        ? "PROVIDER_COMPLETED_PENDING_CONFIRMATION"
        : requestedNext;
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
          status: persistedNextStatus,
        },
      });
      if (changed.count !== 1) throw new Error("FREIGHT_STATUS_CONFLICT");

      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId,
          actorType: "USER",
          organizationId: auth.session.organizationId,
          action: `FREIGHT_STATUS_${persistedNextStatus}`,
          entityType: "FreightRequest",
          entityId: current.id,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: {
            reference: current.reference,
            previousStatus: current.status,
            newStatus: persistedNextStatus,
            providerDeclaredCompletion: requestedNext === "COMPLETED",
            note: parsed.data.note ?? null,
            changedAt: new Date().toISOString(),
          },
        },
      });

      if (requestedNext === "COMPLETED") {
        const remainingActiveAssignments = await tx.freightRequest.count({
          where: {
            organizationId: auth.session.organizationId,
            assignedProviderId: provider.id,
            id: { not: current.id },
            status: {
              in: [
                "ASSIGNED",
                "PROVIDER_EN_ROUTE",
                "PROVIDER_ARRIVED",
                "PICKED_UP",
                "IN_TRANSIT",
                "EXCEPTION",
              ],
            },
          },
        });

        // A provider may carry several nearby jobs. Only release BUSY state
        // after the last active assignment is completed.
        if (shouldReleaseFreightProvider(remainingActiveAssignments)) {
          await tx.freightProvider.updateMany({
            where: { id: provider.id, availability: "BUSY" },
            data: { availability: "AVAILABLE" },
          });
        }
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
