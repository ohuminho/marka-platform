import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const DRIVER_DOCUMENTS = ["IDENTITY_DOCUMENT", "DRIVING_LICENSE", "CRIMINAL_RECORD"];
const VEHICLE_DOCUMENTS = ["VEHICLE_REGISTRATION", "VEHICLE_OWNERSHIP", "VEHICLE_INSURANCE", "VEHICLE_INSPECTION", "VEHICLE_SERVICE_LICENSE"];
const decisionSchema = z.object({
  driverId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED", "INACTIVE"]),
  reason: z.string().trim().max(2000).optional(),
});

async function authorizeAdmin() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const session = await new SessionService().validate(token);
  if (!session) return { error: NextResponse.json({ message: "Sessão inválida." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem rever motoristas." }, { status: 403 }) };
  }
  return { user, session };
}

function isCurrentVerified(items: Array<{ documentType: string; status: string; documentExpiry: Date | null }>, type: string, now: Date) {
  return items.some((item) => item.documentType === type && item.status === "VERIFIED" && (!item.documentExpiry || item.documentExpiry > now));
}

export async function GET() {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;
  const drivers = await prisma.mobilityDriver.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true, slug: true } },
      verifications: { select: { id: true, documentType: true, status: true, documentExpiry: true, rejectionReason: true } },
      vehicles: { where: { activeUntil: null, isPrimary: true }, include: { vehicle: { include: { verifications: { select: { id: true, documentType: true, status: true, documentExpiry: true, rejectionReason: true } } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    drivers: drivers.map((driver) => ({
      id: driver.id, status: driver.status, displayName: driver.displayName, licenseNumber: driver.licenseNumber,
      createdAt: driver.createdAt.toISOString(), user: driver.user, organization: driver.organization,
      verifications: driver.verifications.map((item) => ({ ...item, documentExpiry: item.documentExpiry?.toISOString() ?? null })),
      vehicle: (driver.vehicles[0]?.vehicle ? {
        ...driver.vehicles[0].vehicle,
        createdAt: driver.vehicles[0].vehicle.createdAt.toISOString(),
        updatedAt: driver.vehicles[0].vehicle.updatedAt.toISOString(),
        verifications: driver.vehicles[0].vehicle.verifications.map((item) => ({ ...item, documentExpiry: item.documentExpiry?.toISOString() ?? null })),
      } : null),
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin();
  if ("error" in auth) return auth.error;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Decisão de revisão inválida.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { driverId, status, reason } = parsed.data;
  if ((status === "SUSPENDED" || status === "BLOCKED") && !reason) {
    return NextResponse.json({ message: "É obrigatório indicar o motivo da suspensão ou bloqueio." }, { status: 422 });
  }

  const driver = await prisma.mobilityDriver.findUnique({
    where: { id: driverId },
    include: {
      verifications: { select: { documentType: true, status: true, documentExpiry: true } },
      vehicles: { where: { activeUntil: null, isPrimary: true }, include: { vehicle: { include: { verifications: { select: { documentType: true, status: true, documentExpiry: true } } } } } },
    },
  });
  if (!driver) return NextResponse.json({ message: "Candidatura de motorista não encontrada." }, { status: 404 });

  if (status === "ACTIVE") {
    const now = new Date();
    const missingDriverDocuments = DRIVER_DOCUMENTS.filter((type) => !isCurrentVerified(driver.verifications, type, now));
    const primaryVehicle = driver.vehicles[0]?.vehicle;
    const missingVehicleDocuments = primaryVehicle ? VEHICLE_DOCUMENTS.filter((type) => !isCurrentVerified(primaryVehicle.verifications, type, now)) : ["VEHICLE_NOT_REGISTERED"];
    if (missingDriverDocuments.length || missingVehicleDocuments.length || !primaryVehicle) {
      return NextResponse.json({
        message: "Ativação bloqueada: todos os documentos obrigatórios têm de estar verificados e dentro da validade, e deve existir uma viatura registada.",
        code: "DRIVER_COMPLIANCE_INCOMPLETE",
        missingDriverDocuments,
        missingVehicleDocuments,
      }, { status: 422 });
    }
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.mobilityDriver.update({ where: { id: driver.id }, data: { status } });
      if (status === "ACTIVE" && driver.vehicles[0]?.vehicle) {
        await tx.mobilityVehicle.update({ where: { id: driver.vehicles[0].vehicle.id }, data: { status: "ACTIVE" } });
      } else if (status !== "ACTIVE") {
        await tx.mobilityDriverAvailability.updateMany({ where: { driverId: driver.id }, data: { status: "OFFLINE", lastOfflineAt: new Date() } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actorType: "ADMIN",
          organizationId: driver.organizationId,
          action: status === "ACTIVE" ? "MOBILITY_DRIVER_ACTIVATED" : "MOBILITY_DRIVER_STATUS_CHANGED",
          entityType: "MobilityDriver",
          entityId: driver.id,
          ipAddress,
          userAgent,
          metadata: { status, reason: reason?.trim() || null, driverUserId: driver.userId, primaryVehicleId: driver.vehicles[0]?.vehicle.id ?? null },
        },
      });
    });
    return NextResponse.json({ success: true, driverId: driver.id, status, message: status === "ACTIVE" ? "Motorista e viatura ativados após verificação." : "Estado operacional atualizado." });
  } catch (error) {
    console.error("[MARKA_ADMIN_DRIVER_REVIEW]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível guardar a decisão de revisão." }, { status: 500 });
  }
}
