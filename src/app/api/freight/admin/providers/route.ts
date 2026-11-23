import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { authorizationService } from "@/core/authorization/authorization.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  entityType: z.enum(["PROVIDER", "VEHICLE"]),
  entityId: z.string().uuid(),
  status: z.enum(["VERIFIED", "SUSPENDED", "BLOCKED", "ACTIVE", "RETIRED"]),
  reason: z.string().trim().max(2000).optional(),
});

const activeAssignmentStatuses = [
  "ASSIGNED",
  "PROVIDER_EN_ROUTE",
  "PROVIDER_ARRIVED",
  "PICKED_UP",
  "IN_TRANSIT",
  "PROVIDER_COMPLETED_PENDING_CONFIRMATION",
  "EXCEPTION",
] as const;

async function authorizeAdmin() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const session = await new SessionService().validate(token);
  if (!session) return { error: NextResponse.json({ message: "Sessão inválida." }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, isFounder: true },
  });
  const requestHeaders = await headers();
  const organizationId = requestHeaders.get("x-organization-id")?.trim();
  if (!user || user.status !== "ACTIVE" || !organizationId) {
    return { error: NextResponse.json({ message: "É necessária uma sessão activa com organização seleccionada." }, { status: 403 }) };
  }

  const hasAdminAccess = user.isFounder || await authorizationService.hasPermission(
    user.id,
    "ADMIN_ACCESS",
    organizationId,
  );
  if (!hasAdminAccess) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem gerir prestadores e viaturas." }, { status: 403 }) };
  }
  return { user, organizationId };
}

export async function GET() {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;

  const providers = await prisma.freightProvider.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      vehicles: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const providerIds = providers.map((provider) => provider.id);
  const vehicleIds = providers.flatMap((provider) => provider.vehicles.map((vehicle) => vehicle.id));
  const [providerAssignments, vehicleAssignments] = await Promise.all([
    providerIds.length ? prisma.freightRequest.groupBy({
      by: ["assignedProviderId"],
      where: {
        organizationId: auth.organizationId,
        assignedProviderId: { in: providerIds },
        status: { in: [...activeAssignmentStatuses] },
      },
      _count: { _all: true },
    }) : [],
    vehicleIds.length ? prisma.freightRequest.groupBy({
      by: ["assignedVehicleId"],
      where: {
        organizationId: auth.organizationId,
        assignedVehicleId: { in: vehicleIds },
        status: { in: [...activeAssignmentStatuses] },
      },
      _count: { _all: true },
    }) : [],
  ]);

  const providerCount = new Map(providerAssignments.map((item) => [item.assignedProviderId, item._count._all]));
  const vehicleCount = new Map(vehicleAssignments.map((item) => [item.assignedVehicleId, item._count._all]));

  return NextResponse.json({
    providers: providers.map((provider) => ({
      id: provider.id,
      status: provider.status,
      availability: provider.availability,
      displayName: provider.displayName,
      legalName: provider.legalName,
      phone: provider.phone,
      taxNumber: provider.taxNumber,
      serviceTypes: provider.serviceTypes,
      coverageAreas: provider.coverageAreas,
      locationUpdatedAt: provider.locationUpdatedAt?.toISOString() ?? null,
      activeAssignments: providerCount.get(provider.id) ?? 0,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
      user: provider.user,
      vehicles: provider.vehicles.map((vehicle) => ({
        id: vehicle.id,
        kind: vehicle.kind,
        status: vehicle.status,
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        capacity: vehicle.capacity === null ? null : Number(vehicle.capacity),
        capacityUnit: vehicle.capacityUnit,
        waterType: vehicle.waterType,
        cargoBody: vehicle.cargoBody,
        activeAssignments: vehicleCount.get(vehicle.id) ?? 0,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
      })),
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      message: "Decisão operacional inválida.",
      code: "INVALID_FREIGHT_FLEET_DECISION",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { entityType, entityId, status, reason } = parsed.data;
  const requiresReason = status === "SUSPENDED" || status === "BLOCKED" || status === "RETIRED";
  if (requiresReason && !reason) {
    return NextResponse.json({
      message: "Indique o motivo da suspensão, bloqueio ou retirada da viatura.",
      code: "FREIGHT_FLEET_REASON_REQUIRED",
    }, { status: 422 });
  }
  if (entityType === "PROVIDER" && !["VERIFIED", "SUSPENDED", "BLOCKED"].includes(status)) {
    return NextResponse.json({ message: "Estado de prestador não permitido.", code: "INVALID_PROVIDER_STATUS" }, { status: 400 });
  }
  if (entityType === "VEHICLE" && !["ACTIVE", "SUSPENDED", "BLOCKED", "RETIRED"].includes(status)) {
    return NextResponse.json({ message: "Estado de viatura não permitido.", code: "INVALID_VEHICLE_STATUS" }, { status: 400 });
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const providerId = entityType === "PROVIDER"
        ? entityId
        : (await tx.freightProviderVehicle.findFirst({
            where: { id: entityId },
            select: { providerId: true, provider: { select: { organizationId: true } } },
          }))?.providerId;
      if (!providerId) throw new Error("FREIGHT_FLEET_ENTITY_NOT_FOUND");

      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${providerId}))`;
      await tx.$queryRaw`
        SELECT "id" FROM "FreightProvider"
        WHERE "id" = ${providerId} AND "organizationId" = ${auth.organizationId}
        FOR UPDATE
      `;

      const provider = await tx.freightProvider.findFirst({
        where: { id: providerId, organizationId: auth.organizationId },
        select: { id: true, status: true, availability: true },
      });
      if (!provider) throw new Error("FREIGHT_FLEET_ENTITY_NOT_FOUND");

      const activeProviderAssignments = await tx.freightRequest.count({
        where: {
          organizationId: auth.organizationId,
          assignedProviderId: provider.id,
          status: { in: [...activeAssignmentStatuses] },
        },
      });

      if (entityType === "PROVIDER") {
        if (status === "BLOCKED" && activeProviderAssignments > 0) {
          throw new Error("FREIGHT_PROVIDER_HAS_ACTIVE_ASSIGNMENTS");
        }
        if (status === "VERIFIED") {
          await tx.freightProvider.update({
            where: { id: provider.id },
            data: { status: "VERIFIED", availability: "OFFLINE" },
          });
        } else {
          const providerStatus = status === "SUSPENDED" ? "SUSPENDED" : "BLOCKED";
          await tx.freightProvider.update({
            where: { id: provider.id },
            data: { status: providerStatus, availability: "OFFLINE" },
          });
        }
        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            actorType: "ADMIN",
            organizationId: auth.organizationId,
            action: "FREIGHT_PROVIDER_STATUS_CHANGED",
            entityType: "FreightProvider",
            entityId: provider.id,
            ipAddress,
            userAgent,
            metadata: {
              previousStatus: provider.status,
              status,
              previousAvailability: provider.availability,
              resultingAvailability: "OFFLINE",
              activeAssignmentsPreserved: status === "SUSPENDED" ? activeProviderAssignments : 0,
              reason: reason?.trim() || null,
            },
          },
        });
        return { entityType, entityId: provider.id, status, availability: "OFFLINE", activeAssignments: activeProviderAssignments };
      }

      const vehicle = await tx.freightProviderVehicle.findFirst({
        where: { id: entityId, providerId: provider.id },
        select: { id: true, status: true, kind: true },
      });
      if (!vehicle) throw new Error("FREIGHT_FLEET_ENTITY_NOT_FOUND");
      if (status === "ACTIVE" && provider.status !== "VERIFIED") {
        throw new Error("FREIGHT_PROVIDER_MUST_BE_VERIFIED");
      }

      const activeVehicleAssignments = await tx.freightRequest.count({
        where: {
          organizationId: auth.organizationId,
          assignedProviderId: provider.id,
          assignedVehicleId: vehicle.id,
          status: { in: [...activeAssignmentStatuses] },
        },
      });
      if ((status === "BLOCKED" || status === "RETIRED") && activeVehicleAssignments > 0) {
        throw new Error("FREIGHT_VEHICLE_HAS_ACTIVE_ASSIGNMENTS");
      }

      const vehicleStatus = status === "ACTIVE" ? "ACTIVE"
        : status === "SUSPENDED" ? "SUSPENDED"
          : status === "BLOCKED" ? "BLOCKED" : "RETIRED";
      await tx.freightProviderVehicle.update({
        where: { id: vehicle.id },
        data: { status: vehicleStatus },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actorType: "ADMIN",
          organizationId: auth.organizationId,
          action: "FREIGHT_PROVIDER_VEHICLE_STATUS_CHANGED",
          entityType: "FreightProviderVehicle",
          entityId: vehicle.id,
          ipAddress,
          userAgent,
          metadata: {
            providerId: provider.id,
            kind: vehicle.kind,
            previousStatus: vehicle.status,
            status,
            activeAssignmentsPreserved: status === "SUSPENDED" ? activeVehicleAssignments : 0,
            reason: reason?.trim() || null,
          },
        },
      });
      return { entityType, entityId: vehicle.id, status, activeAssignments: activeVehicleAssignments };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: result.status === "SUSPENDED"
        ? "Suspensão aplicada a novas atribuições. Os serviços já atribuídos foram preservados."
        : "Estado operacional actualizado.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_FLEET_UPDATE_FAILED";
    const conflict = [
      "FREIGHT_FLEET_ENTITY_NOT_FOUND",
      "FREIGHT_PROVIDER_HAS_ACTIVE_ASSIGNMENTS",
      "FREIGHT_VEHICLE_HAS_ACTIVE_ASSIGNMENTS",
      "FREIGHT_PROVIDER_MUST_BE_VERIFIED",
    ].includes(code);
    const message = code === "FREIGHT_FLEET_ENTITY_NOT_FOUND"
      ? "Prestador ou viatura não encontrado nesta organização."
      : code === "FREIGHT_PROVIDER_HAS_ACTIVE_ASSIGNMENTS"
        ? "O prestador tem serviços em curso. Suspenda-o para impedir novos pedidos ou conclua/realoque os serviços antes de o bloquear."
        : code === "FREIGHT_VEHICLE_HAS_ACTIVE_ASSIGNMENTS"
          ? "A viatura tem serviços atribuídos. Pode suspendê-la para impedir novas atribuições; bloquear ou retirar exige concluir/reafectar esses serviços."
          : code === "FREIGHT_PROVIDER_MUST_BE_VERIFIED"
            ? "A viatura só pode ser activada quando o prestador estiver verificado."
            : "Não foi possível actualizar o estado operacional.";
    return NextResponse.json({ message, code }, { status: conflict ? 409 : 500 });
  }
}
