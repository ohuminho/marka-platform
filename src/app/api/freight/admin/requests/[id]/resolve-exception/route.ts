import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { authorizationService } from "@/core/authorization/authorization.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  note: z.string().trim().min(5).max(1000),
});

const resumableStatuses = new Set([
  "ASSIGNED",
  "PROVIDER_EN_ROUTE",
  "PROVIDER_ARRIVED",
  "PICKED_UP",
  "IN_TRANSIT",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) {
    return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
  }

  const session = await new SessionService().validate(token);
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, isFounder: true },
  });
  const requestHeaders = await headers();
  const organizationId = requestHeaders.get("x-organization-id")?.trim();

  if (!user || user.status !== "ACTIVE" || !organizationId) {
    return NextResponse.json({
      message: "É necessária uma sessão ativa com organização selecionada.",
    }, { status: 403 });
  }

  const hasAdminAccess = user.isFounder || await authorizationService.hasPermission(
    user.id,
    "ADMIN_ACCESS",
    organizationId,
  );
  if (!hasAdminAccess) {
    return NextResponse.json({
      message: "Apenas administradores autorizados podem resolver ocorrências.",
    }, { status: 403 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      message: "Registe uma decisão administrativa com pelo menos cinco caracteres.",
      code: "INVALID_EXCEPTION_RESOLUTION",
    }, { status: 400 });
  }

  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.freightRequest.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          reference: true,
          status: true,
          assignedProviderId: true,
          assignedVehicleId: true,
        },
      });
      if (!current) throw new Error("FREIGHT_REQUEST_NOT_FOUND");
      if (current.status !== "EXCEPTION") throw new Error("FREIGHT_NOT_IN_EXCEPTION");

      if (!current.assignedProviderId || !current.assignedVehicleId) {
        throw new Error("FREIGHT_ASSIGNMENT_INCOMPLETE");
      }

      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${current.assignedProviderId}))`;

      const provider = await tx.freightProvider.findFirst({
        where: {
          id: current.assignedProviderId,
          organizationId,
          status: "VERIFIED",
          availability: { in: ["AVAILABLE", "BUSY"] },
        },
        select: { id: true, availability: true },
      });
      if (!provider) throw new Error("FREIGHT_PROVIDER_NOT_RESUMABLE");

      const vehicle = await tx.freightProviderVehicle.findFirst({
        where: {
          id: current.assignedVehicleId,
          providerId: provider.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!vehicle) throw new Error("FREIGHT_VEHICLE_NOT_ACTIVE");

      const exceptionEvent = await tx.auditLog.findFirst({
        where: {
          organizationId,
          entityType: "FreightRequest",
          entityId: current.id,
          action: "FREIGHT_STATUS_EXCEPTION",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true, createdAt: true },
      });
      const exceptionMetadata = exceptionEvent?.metadata && typeof exceptionEvent.metadata === "object"
        ? exceptionEvent.metadata as Record<string, unknown>
        : {};
      const previousStatus = exceptionMetadata.previousStatus;
      if (typeof previousStatus !== "string" || !resumableStatuses.has(previousStatus)) {
        throw new Error("FREIGHT_EXCEPTION_ORIGIN_UNKNOWN");
      }

      const changed = await tx.freightRequest.updateMany({
        where: {
          id: current.id,
          organizationId,
          status: "EXCEPTION",
          assignedProviderId: provider.id,
          assignedVehicleId: vehicle.id,
        },
        data: { status: previousStatus },
      });
      if (changed.count !== 1) throw new Error("FREIGHT_EXCEPTION_RESOLUTION_CONFLICT");

      if (provider.availability === "AVAILABLE") {
        await tx.freightProvider.updateMany({
          where: { id: provider.id, status: "VERIFIED", availability: "AVAILABLE" },
          data: { availability: "BUSY" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          actorType: "ADMIN",
          organizationId,
          action: "FREIGHT_EXCEPTION_RESUMED",
          entityType: "FreightRequest",
          entityId: current.id,
          ipAddress,
          userAgent,
          metadata: {
            reference: current.reference,
            previousStatus: "EXCEPTION",
            resultingStatus: previousStatus,
            exceptionReportedAt: exceptionEvent?.createdAt.toISOString() ?? null,
            decisionNote: parsed.data.note,
            resolvedAt: new Date().toISOString(),
          },
        },
      });

      return {
        id: current.id,
        reference: current.reference,
        status: previousStatus,
      };
    });

    return NextResponse.json({
      success: true,
      request: result,
      message: "Ocorrência resolvida. O serviço regressou ao estado operacional anterior.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FREIGHT_EXCEPTION_RESOLUTION_FAILED";
    const notFound = code === "FREIGHT_REQUEST_NOT_FOUND";
    const conflict = [
      "FREIGHT_NOT_IN_EXCEPTION",
      "FREIGHT_ASSIGNMENT_INCOMPLETE",
      "FREIGHT_PROVIDER_NOT_RESUMABLE",
      "FREIGHT_VEHICLE_NOT_ACTIVE",
      "FREIGHT_EXCEPTION_ORIGIN_UNKNOWN",
      "FREIGHT_EXCEPTION_RESOLUTION_CONFLICT",
    ].includes(code);

    return NextResponse.json({
      message: notFound
        ? "Pedido não encontrado."
        : code === "FREIGHT_NOT_IN_EXCEPTION"
          ? "O pedido já não está em estado de ocorrência."
          : code === "FREIGHT_ASSIGNMENT_INCOMPLETE"
            ? "Não existe uma atribuição completa para retomar este serviço."
            : code === "FREIGHT_PROVIDER_NOT_RESUMABLE"
              ? "O prestador não está verificado ou disponível para retomar o serviço."
              : code === "FREIGHT_VEHICLE_NOT_ACTIVE"
                ? "A viatura atribuída já não está activa."
                : code === "FREIGHT_EXCEPTION_ORIGIN_UNKNOWN"
                  ? "Não foi possível determinar com segurança o estado anterior. É necessária análise manual."
                  : conflict
                    ? "O estado do pedido mudou. Actualize a fila e tente novamente."
                    : "Não foi possível resolver a ocorrência.",
      code,
    }, { status: notFound ? 404 : conflict ? 409 : 500 });
  }
}
