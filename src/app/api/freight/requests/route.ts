import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateMobilityRequest,
  getIdempotencyKey,
} from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";
import type { Prisma } from "@prisma/client";

const pointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  address: z.string().trim().max(500).optional(),
});

const requestSchema = z.object({
  requestType: z.enum([
    "CARGO_SHIPMENT",
    "WATER_DELIVERY",
    "ROADSIDE_ASSISTANCE",
  ]),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  origin: pointSchema.optional(),
  destination: pointSchema.optional(),
  quantity: z.number().finite().positive().max(100000000).optional(),
  quantityUnit: z.enum(["KG", "TON", "M3", "LITRE"]).optional(),
  currency: z.string().trim().toUpperCase().length(3).default("AOA"),
  details: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, context) => {
  if (value.requestType === "CARGO_SHIPMENT") {
    if (!value.origin) {
      context.addIssue({ code: "custom", path: ["origin"], message: "O local de recolha é obrigatório." });
    }
    if (!value.destination) {
      context.addIssue({ code: "custom", path: ["destination"], message: "O destino é obrigatório." });
    }
    const cargoItems = value.details.cargoItems;
    if (!Array.isArray(cargoItems) || cargoItems.length === 0) {
      context.addIssue({ code: "custom", path: ["details", "cargoItems"], message: "Indique pelo menos um artigo ou material a transportar." });
    }
  }

  if (value.requestType === "WATER_DELIVERY") {
    if (!value.destination) {
      context.addIssue({ code: "custom", path: ["destination"], message: "O endereço de entrega da água é obrigatório." });
    }
    if (!value.quantity || !value.quantityUnit || !["LITRE", "M3"].includes(value.quantityUnit)) {
      context.addIssue({ code: "custom", path: ["quantity"], message: "Indique a quantidade de água em litros ou metros cúbicos." });
    }
    if (!["POTABLE_WATER", "NON_POTABLE_WATER"].includes(String(value.details.waterType ?? ""))) {
      context.addIssue({ code: "custom", path: ["details", "waterType"], message: "Indique se a água é potável ou não potável." });
    }
  }

  if (value.requestType === "ROADSIDE_ASSISTANCE") {
    if (!value.origin) {
      context.addIssue({ code: "custom", path: ["origin"], message: "A localização atual do veículo é obrigatória." });
    }
    if (!String(value.details.vehicleDescription ?? "").trim()) {
      context.addIssue({ code: "custom", path: ["details", "vehicleDescription"], message: "Descreva o veículo." });
    }
    if (!["TOW", "ACCIDENT_RECOVERY", "BREAKDOWN_RECOVERY", "TIRE_ASSISTANCE", "BATTERY_ASSISTANCE", "ON_SITE_MECHANIC"].includes(String(value.details.assistanceType ?? ""))) {
      context.addIssue({ code: "custom", path: ["details", "assistanceType"], message: "Selecione o tipo de assistência." });
    }
  }
});

function publicRequest(record: {
  id: string;
  reference: string;
  requestType: string;
  status: string;
  originLatitude: unknown;
  originLongitude: unknown;
  originAddress: string | null;
  destinationLatitude: unknown;
  destinationLongitude: unknown;
  destinationAddress: string | null;
  quantity: unknown;
  quantityUnit: string | null;
  currency: string;
  quotedAmount: unknown;
  quoteExpiresAt: Date | null;
  paymentReference: string | null;
  paidAt: Date | null;
  details: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    reference: record.reference,
    requestType: record.requestType,
    status: record.status,
    origin: record.originLatitude === null ? null : {
      latitude: Number(record.originLatitude),
      longitude: Number(record.originLongitude),
      address: record.originAddress,
    },
    destination: record.destinationLatitude === null ? null : {
      latitude: Number(record.destinationLatitude),
      longitude: Number(record.destinationLongitude),
      address: record.destinationAddress,
    },
    quantity: record.quantity === null ? null : Number(record.quantity),
    quantityUnit: record.quantityUnit,
    currency: record.currency,
    quotedAmount: record.quotedAmount === null ? null : Number(record.quotedAmount),
    quoteExpiresAt: record.quoteExpiresAt,
    paymentReference: record.paymentReference,
    paidAt: record.paidAt,
    details: record.details,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function GET(request: Request) {
  const authentication = await authenticateMobilityRequest(request);
  if (!authentication.ok) return authentication.response;

  const requests = await prisma.freightRequest.findMany({
    where: {
      organizationId: authentication.session.organizationId,
      requesterId: authentication.session.userId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests: requests.map(publicRequest) });
}

export async function POST(request: Request) {
  const authentication = await authenticateMobilityRequest(request);
  if (!authentication.ok) return authentication.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corpo do pedido inválido.", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Os dados do pedido não são válidos.",
        code: "INVALID_FREIGHT_REQUEST",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const idempotencyKey = getIdempotencyKey(request, body);
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json(
      { message: "É necessária uma chave de idempotência válida.", code: "IDEMPOTENCY_KEY_REQUIRED" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const requestHash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");

  try {
    const created = await prisma.freightRequest.create({
      data: {
        id: randomUUID(),
        reference: `FR-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        organizationId: authentication.session.organizationId,
        requesterId: authentication.session.userId,
        requestType: input.requestType,
        status: "REQUESTED",
        originLatitude: input.origin?.latitude,
        originLongitude: input.origin?.longitude,
        originAddress: input.origin?.address,
        destinationLatitude: input.destination?.latitude,
        destinationLongitude: input.destination?.longitude,
        destinationAddress: input.destination?.address,
        quantity: input.quantity,
        quantityUnit: input.quantityUnit,
        currency: input.currency,
        idempotencyKey,
        requestHash,
        details: input.details as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ request: publicRequest(created), replayed: false }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await prisma.freightRequest.findUnique({
        where: {
          organizationId_requesterId_idempotencyKey: {
            organizationId: authentication.session.organizationId,
            requesterId: authentication.session.userId,
            idempotencyKey,
          },
        },
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          return NextResponse.json(
            { message: "A chave já foi utilizada com dados diferentes.", code: "IDEMPOTENCY_CONFLICT" },
            { status: 409 },
          );
        }
        return NextResponse.json({ request: publicRequest(existing), replayed: true });
      }
    }

    console.error("[FREIGHT_REQUEST_CREATE_ERROR]", error);
    return NextResponse.json(
      { message: "Não foi possível registar o pedido de transporte ou assistência.", code: "FREIGHT_REQUEST_CREATE_FAILED" },
      { status: 500 },
    );
  }
}
