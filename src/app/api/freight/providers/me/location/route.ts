import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyM: z.number().int().min(0).max(100000).optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Coordenadas GPS inválidas.", code: "INVALID_FREIGHT_PROVIDER_LOCATION" },
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
    select: { id: true, status: true, availability: true },
  });

  if (!provider || provider.status !== "VERIFIED") {
    return NextResponse.json(
      { message: "Apenas prestadores verificados podem partilhar localização.", code: "FREIGHT_PROVIDER_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  const activeAssignments = await prisma.freightRequest.count({
    where: {
      organizationId: auth.session.organizationId,
      assignedProviderId: provider.id,
      status: { in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"] },
    },
  });

  if (
    provider.availability !== "AVAILABLE" &&
    provider.availability !== "BUSY" &&
    activeAssignments === 0
  ) {
    return NextResponse.json(
      { message: "Active a disponibilidade antes de partilhar a localização.", code: "FREIGHT_PROVIDER_NOT_AVAILABLE" },
      { status: 409 },
    );
  }

  const updatedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${provider.id}))`;
    const currentProvider = await tx.freightProvider.findUnique({
      where: { id: provider.id },
      select: { status: true, availability: true },
    });
    if (!currentProvider || currentProvider.status !== "VERIFIED") {
      throw new Error("FREIGHT_PROVIDER_NOT_VERIFIED");
    }
    const currentAssignments = await tx.freightRequest.count({
      where: {
        organizationId: auth.session.organizationId,
        assignedProviderId: provider.id,
        status: { in: ["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"] },
      },
    });
    if (
      currentProvider.availability !== "AVAILABLE" &&
      currentProvider.availability !== "BUSY" &&
      currentAssignments === 0
    ) {
      throw new Error("FREIGHT_PROVIDER_NOT_AVAILABLE");
    }
    await tx.freightProvider.update({
      where: { id: provider.id },
      data: {
        currentLatitude: parsed.data.latitude,
        currentLongitude: parsed.data.longitude,
        locationUpdatedAt: updatedAt,
        locationAccuracyM: parsed.data.accuracyM ?? null,
      },
    });
  });

  return NextResponse.json(
    { ok: true, updatedAt },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function DELETE(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const provider = await prisma.freightProvider.findUnique({
    where: {
      organizationId_userId: {
        organizationId: auth.session.organizationId,
        userId: auth.session.userId,
      },
    },
    select: { id: true },
  });

  if (!provider) {
    return NextResponse.json(
      { message: "Prestador não encontrado.", code: "FREIGHT_PROVIDER_NOT_FOUND" },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(741921, hashtext(${provider.id}))`;
    await tx.freightProvider.update({
      where: { id: provider.id },
      data: {
        currentLatitude: null,
        currentLongitude: null,
        locationUpdatedAt: null,
        locationAccuracyM: null,
      },
    });
  });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
