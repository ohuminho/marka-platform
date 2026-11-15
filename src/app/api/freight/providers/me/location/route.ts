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

  if (provider.availability !== "AVAILABLE" && provider.availability !== "BUSY") {
    return NextResponse.json(
      { message: "Active a disponibilidade antes de partilhar a localização.", code: "FREIGHT_PROVIDER_NOT_AVAILABLE" },
      { status: 409 },
    );
  }

  const updatedAt = new Date();
  await prisma.freightProvider.update({
    where: { id: provider.id },
    data: {
      currentLatitude: parsed.data.latitude,
      currentLongitude: parsed.data.longitude,
      locationUpdatedAt: updatedAt,
      locationAccuracyM: parsed.data.accuracyM ?? null,
    },
  });

  return NextResponse.json(
    { ok: true, updatedAt },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
