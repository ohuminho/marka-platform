import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { prisma } from "@/database/client/prisma";

const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().positive().max(1000),
});

export async function PUT(request: Request) {
  const auth = await authenticateMobilityRequest(request);
  if (!auth.ok) return auth.response;

  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      message: "A posição GPS ou a precisão indicada não é válida.",
      code: "INVALID_FREIGHT_PROVIDER_LOCATION",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
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
    return NextResponse.json({
      message: "A localização só pode ser partilhada por prestadores verificados.",
      code: "FREIGHT_PROVIDER_NOT_VERIFIED",
    }, { status: 403 });
  }

  if (!["AVAILABLE", "BUSY"].includes(provider.availability)) {
    return NextResponse.json({
      message: "Active a disponibilidade para partilhar a localização operacional.",
      code: "FREIGHT_PROVIDER_NOT_AVAILABLE",
    }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.freightProvider.updateMany({
    where: {
      id: provider.id,
      status: "VERIFIED",
      availability: { in: ["AVAILABLE", "BUSY"] },
    },
    data: {
      currentLatitude: parsed.data.latitude,
      currentLongitude: parsed.data.longitude,
      locationAccuracyMeters: parsed.data.accuracyMeters,
      locationUpdatedAt: now,
    },
  });

  if (updated.count !== 1) {
    return NextResponse.json({
      message: "A disponibilidade do prestador mudou. Actualize o estado e tente novamente.",
      code: "FREIGHT_PROVIDER_LOCATION_CONFLICT",
    }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    location: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracyMeters: parsed.data.accuracyMeters,
      updatedAt: now.toISOString(),
    },
  });
}
