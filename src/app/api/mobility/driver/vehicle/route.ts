import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { resolveDriverOrganizationId } from "@/app/api/mobility/_lib/driver-organization";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["CAR", "MOTORCYCLE", "VAN", "MINIBUS", "BUS", "COACH", "TRUCK", "OTHER"]),
  vehicleSubtype: z.enum(["SEDAN", "SUV", "HATCHBACK", "LUXURY_SEDAN", "CARGO_TRICYCLE", "PICKUP", "CLOSED_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "DUMP_TRUCK", "HEAVY_TRUCK", "WATER_TANKER"]).optional(),
  ownershipType: z.enum(["DRIVER_OWNED", "THIRD_PARTY_AUTHORIZED"]),
  ownerName: z.string().trim().max(120).optional().default(""),
  ownerPhone: z.string().trim().max(40).optional().default(""),
  registrationNumber: z.string().trim().min(3).max(32),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(2).max(40),
  capacity: z.coerce.number().int().min(1).max(100).default(4),
}).superRefine((value, context) => {
  if (value.type === "CAR" && !["SEDAN", "SUV", "HATCHBACK", "LUXURY_SEDAN", "PICKUP"].includes(value.vehicleSubtype ?? "")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["vehicleSubtype"], message: "Seleciona a categoria do automóvel." });
  }
  if (value.type === "TRUCK" && !value.vehicleSubtype) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["vehicleSubtype"], message: "Seleciona o tipo de veículo de carga." });
  }
  if (value.type === "MOTORCYCLE" && value.capacity !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["capacity"], message: "O moto-táxi está limitado a um passageiro." });
  }
  if (value.ownershipType === "THIRD_PARTY_AUTHORIZED" && value.ownerName.trim().length < 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["ownerName"], message: "Indica o nome do proprietário do veículo." });
  }
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
  const organizationId = await resolveDriverOrganizationId(session.userId, request.headers.get("X-Organization-Id")?.trim());
  if (!organizationId) return NextResponse.json({ message: "A conta ainda não tem uma associação MARKA ativa.", code: "MARKA_MEMBERSHIP_REQUIRED" }, { status: 403 });
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
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "A conta MARKA deve estar ativa." }, { status: 403 });
  const organizationId = await resolveDriverOrganizationId(user.id, request.headers.get("X-Organization-Id")?.trim());
  if (!organizationId) return NextResponse.json({ message: "A conta ainda não tem uma associação MARKA ativa.", code: "MARKA_MEMBERSHIP_REQUIRED" }, { status: 403 });
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
        select: { vehicleId: true, vehicle: { select: { metadata: true } } },
      });
      const previousMetadata = currentLink?.vehicle.metadata && typeof currentLink.vehicle.metadata === "object" && !Array.isArray(currentLink.vehicle.metadata)
        ? currentLink.vehicle.metadata as Record<string, unknown>
        : {};
      const ownershipMetadata = {
        ownershipType: input.ownershipType,
        ownerName: input.ownershipType === "THIRD_PARTY_AUTHORIZED" ? input.ownerName.trim() : null,
        ownerPhone: input.ownershipType === "THIRD_PARTY_AUTHORIZED" ? input.ownerPhone || null : null,
        ownershipDeclarationAt: new Date().toISOString(),
        vehicleSubtype: input.type === "CAR" || input.type === "TRUCK" ? input.vehicleSubtype : null,
      };
      const vehicle = currentLink
        ? await tx.mobilityVehicle.update({
            where: { id: currentLink.vehicleId },
            data: { type: input.type, registrationNumber, make: input.make, model: input.model, year: input.year, color: input.color, capacity: input.capacity, countryCode: "AO", status: "PENDING", metadata: { ...previousMetadata, ...ownershipMetadata } },
          })
        : await tx.mobilityVehicle.create({
            data: { organizationId, type: input.type, registrationNumber, make: input.make, model: input.model, year: input.year, color: input.color, capacity: input.capacity, countryCode: "AO", status: "PENDING", metadata: { ...ownershipMetadata } },
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
