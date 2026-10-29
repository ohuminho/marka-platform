import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["CAR", "MOTORCYCLE", "VAN", "MINIBUS", "BUS", "COACH", "TRUCK", "OTHER"]),
  registrationNumber: z.string().trim().min(3).max(32),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(2).max(40),
  capacity: z.coerce.number().int().min(1).max(100).default(4),
});

const REQUIRED = [
  { documentType: "VEHICLE_REGISTRATION", label: "Livrete / documento de registo do veículo" },
  { documentType: "VEHICLE_OWNERSHIP", label: "Título de propriedade ou autorização de uso" },
  { documentType: "VEHICLE_INSURANCE", label: "Seguro automóvel obrigatório e cobertura aplicável" },
  { documentType: "VEHICLE_INSPECTION", label: "Inspeção técnica válida, quando aplicável" },
  { documentType: "VEHICLE_SERVICE_LICENSE", label: "Licença/autorização para o serviço, quando exigida" },
] as const;

async function getSession() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return null;
  return new SessionService().validate(token);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
  const organizationId = request.headers.get("X-Organization-Id")?.trim();
  if (!organizationId) return NextResponse.json({ message: "Seleciona a organização MARKA." }, { status: 400 });
  const driver = await prisma.mobilityDriver.findFirst({
    where: { userId: session.userId, organizationId },
    include: { vehicles: { where: { activeUntil: null }, include: { vehicle: { include: { verifications: true } } } } },
  });
  if (!driver) return NextResponse.json({ vehicle: null, requiredVehicleDocuments: REQUIRED });
  const primary = driver.vehicles.find((item) => item.isPrimary) ?? driver.vehicles[0];
  return NextResponse.json({ vehicle: primary?.vehicle ?? null, requiredVehicleDocuments: REQUIRED }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
  const organizationId = request.headers.get("X-Organization-Id")?.trim();
  if (!organizationId) return NextResponse.json({ message: "Seleciona a organização MARKA." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "A conta MARKA deve estar ativa." }, { status: 403 });
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: user.id, organizationId, status: "ACTIVE", organization: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ message: "Acesso à organização negado." }, { status: 403 });
  const acceptedTerms = await prisma.auditLog.findFirst({
    where: { actorUserId: user.id, organizationId, action: "MOBILITY_DRIVER_TERMS_ACCEPTED", entityType: "MobilityDriverTerms", entityId: "MARKA-MOBILITY-DRIVER-2026-10-29" },
    select: { id: true },
  });
  if (!acceptedTerms) return NextResponse.json({ message: "Aceita primeiro os Termos de Adesão do Motorista.", code: "DRIVER_TERMS_NOT_ACCEPTED" }, { status: 422 });
  const driver = await prisma.mobilityDriver.findFirst({ where: { userId: user.id, organizationId }, select: { id: true } });
  if (!driver) return NextResponse.json({ message: "Inicia primeiro a candidatura de motorista.", code: "DRIVER_APPLICATION_REQUIRED" }, { status: 409 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Confirma os dados obrigatórios do veículo.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const input = parsed.data;
  const registrationNumber = input.registrationNumber.toUpperCase().replace(/\s+/g, " ");
  const duplicate = await prisma.mobilityVehicle.findFirst({
    where: { organizationId, registrationNumber, drivers: { some: { driverId: { not: driver.id }, activeUntil: null } } },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ message: "Esta matrícula já está associada a outro motorista ativo.", code: "VEHICLE_ALREADY_ASSIGNED" }, { status: 409 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentLink = await tx.mobilityDriverVehicle.findFirst({
        where: { driverId: driver.id, activeUntil: null, isPrimary: true },
        select: { vehicleId: true },
      });
      const vehicle = currentLink
        ? await tx.mobilityVehicle.update({
            where: { id: currentLink.vehicleId },
            data: { type: input.type, registrationNumber, make: input.make, model: input.model, year: input.year, color: input.color, capacity: input.capacity, countryCode: "AO", status: "PENDING" },
          })
        : await tx.mobilityVehicle.create({
            data: { organizationId, type: input.type, registrationNumber, make: input.make, model: input.model, year: input.year, color: input.color, capacity: input.capacity, countryCode: "AO", status: "PENDING" },
          });

      if (currentLink) {
        await tx.mobilityDriverVehicle.update({
          where: { driverId_vehicleId: { driverId: driver.id, vehicleId: vehicle.id } },
          data: { isPrimary: true, activeUntil: null },
        });
      } else {
        await tx.mobilityDriverVehicle.create({
          data: { driverId: driver.id, vehicleId: vehicle.id, isPrimary: true },
        });
      }

      for (const requirement of REQUIRED) {
        const existingVerification = await tx.mobilityVehicleVerification.findFirst({
          where: { vehicleId: vehicle.id, documentType: requirement.documentType },
          select: { id: true },
        });
        if (!existingVerification) {
          await tx.mobilityVehicleVerification.create({
            data: {
              vehicleId: vehicle.id,
              documentType: requirement.documentType,
              status: "PENDING",
              metadata: { requirementLabel: requirement.label, documentSubmitted: false, source: "ANGOLA_DRIVER_ONBOARDING" },
            },
          });
        }
      }
      return tx.mobilityVehicle.findUniqueOrThrow({
        where: { id: vehicle.id },
        include: { verifications: true },
      });
    });
    return NextResponse.json({ vehicle: result, requiredVehicleDocuments: REQUIRED }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("[MARKA_DRIVER_VEHICLE_ONBOARDING]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível guardar os dados do veículo." }, { status: 500 });
  }
}
