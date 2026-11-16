import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-AO")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) {
    return NextResponse.json({ places: [] }, { status: 401 });
  }

  const session = await new SessionService().validate(token);
  if (!session) {
    return NextResponse.json({ places: [] }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ places: [] }, { status: 401 });
  }

  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = normalizeSearch(rawQuery);
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ places: [] }, { status: 200 });
  }

  const quota = await reserveApiRequest({
    scope: "MOBILITY_LANDMARK_SEARCH",
    actorUserId: session.userId,
    windows: [
      { limit: 30, windowMs: 60_000 },
      { limit: 300, windowMs: 24 * 60 * 60 * 1_000 },
    ],
  });
  if (!quota.allowed) {
    return NextResponse.json({ places: [] }, {
      status: 429,
      headers: { "Retry-After": String(quota.retryAfterSeconds) },
    });
  }

  try {
    const places = await prisma.mobilityLandmark.findMany({
      where: {
        countryCode: "AO",
        isActive: true,
        OR: [
          { normalizedName: { contains: query } },
          { aliases: { has: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        province: true,
        municipality: true,
        category: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [
        { verifiedAt: "desc" },
        { name: "asc" },
      ],
      take: 8,
    });

    return NextResponse.json({
      places: places.map((place) => ({
        id: place.id,
        label: [place.name, place.municipality, place.province]
          .filter(Boolean)
          .join(", "),
        lat: place.latitude,
        lon: place.longitude,
        category: place.category,
        source: "MARKA_CATALOG",
      })),
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch {
    // During migration rollout, the client can continue with Photon fallback.
    return NextResponse.json({ places: [], catalogUnavailable: true }, { status: 200 });
  }
}
