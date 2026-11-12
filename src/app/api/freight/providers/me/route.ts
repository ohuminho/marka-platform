import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const vehicleSchema = z.object({
  kind: z.enum([
    "CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK",
    "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "WATER_TANKER",
    "TOW_TRUCK", "SERVICE_VEHICLE", "SPECIALIZED",
  ]),
  registrationNumber: z.string().trim().max(40).optional(),
  make: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  color: z.string().trim().max(40).optional(),
  capacity: z.number().finite().positive().max(100000000).optional(),
  capacityUnit: z.enum(["KG", "TON", "M3", "LITRE"]).optional(),
  waterType: z.enum(["POTABLE_WATER", "NON_POTABLE_WATER"]).optional(),
  cargoBody: z.enum(["OPEN", "BOX", "FLATBED", "TIPPER", "TANK"]).optional(),
  serviceAreas: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
}).superRefine((vehicle, context) => {
  if (vehicle.kind === "WATER_TANKER" && (!vehicle.waterType || !vehicle.capacity || !["LITRE", "M3"].includes(vehicle.capacityUnit ?? ""))) {
    context.addIssue({ code: "custom", path: ["waterType"], message: "A cisterna exige tipo de água, capacidade e unidade em litros ou m³." });
  }
});

const providerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  taxNumber: z.string().trim().max(40).optional(),
  serviceTypes: z.array(z.enum(["CARGO_SHIPMENT", "WATER_DELIVERY", "ROADSIDE_ASSISTANCE"])).min(1).max(3),
  coverageAreas: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  vehicles: z.array(vehicleSchema).max(20).default([]),
});

export async function GET(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const provider = await prisma.freightProvider.findUnique({
    where: {
      organizationId_userId: {
        organizationId: auth.session.organizationId,
        userId: auth.session.userId,
      },
    },
    include: { vehicles: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ provider });
}

export async function POST(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo do pedido inválido.", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = providerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      message: "Os dados do prestador ou dos veículos não são válidos.",
      code: "INVALID_FREIGHT_PROVIDER",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const input = parsed.data;
  const vehiclesProvided = typeof body === "object" && body !== null && Object.prototype.hasOwnProperty.call(body, "vehicles");
  try {
    const provider = await prisma.$transaction(async (tx) => {
      const saved = await tx.freightProvider.upsert({
        where: {
          organizationId_userId: {
            organizationId: auth.session.organizationId,
            userId: auth.session.userId,
          },
        },
        create: {
          id: randomUUID(),
          organizationId: auth.session.organizationId,
          userId: auth.session.userId,
          displayName: input.displayName,
          legalName: input.legalName,
          phone: input.phone,
          taxNumber: input.taxNumber,
          serviceTypes: input.serviceTypes,
          coverageAreas: input.coverageAreas,
          status: "PENDING",
          availability: "OFFLINE",
        },
        update: {
          displayName: input.displayName,
          legalName: input.legalName,
          phone: input.phone,
          taxNumber: input.taxNumber,
          serviceTypes: input.serviceTypes,
          coverageAreas: input.coverageAreas,
        },
      });

      if (vehiclesProvided) {
        await tx.freightProviderVehicle.deleteMany({
          where: { providerId: saved.id, status: "PENDING" },
        });
      }

      if (vehiclesProvided && input.vehicles.length) {
        await tx.freightProviderVehicle.createMany({
          data: input.vehicles.map((vehicle) => ({
            id: randomUUID(),
            providerId: saved.id,
            kind: vehicle.kind,
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            capacity: vehicle.capacity,
            capacityUnit: vehicle.capacityUnit,
            waterType: vehicle.waterType,
            cargoBody: vehicle.cargoBody,
            serviceAreas: vehicle.serviceAreas,
            status: "PENDING",
          })),
        });
      }

      return tx.freightProvider.findUniqueOrThrow({
        where: { id: saved.id },
        include: { vehicles: { orderBy: { createdAt: "desc" } } },
      });
    });

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    console.error("[FREIGHT_PROVIDER_UPSERT_ERROR]", error);
    return NextResponse.json({
      message: "Não foi possível registar o prestador neste momento.",
      code: "FREIGHT_PROVIDER_SAVE_FAILED",
    }, { status: 500 });
  }
}
