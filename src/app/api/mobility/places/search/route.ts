import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

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
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = normalizeSearch(rawQuery);

  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ places: [] }, { status: 200 });
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
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch {
    // Keep the geocoder usable while a newly added migration is rolling out.
    return NextResponse.json({ places: [], catalogUnavailable: true }, { status: 200 });
  }
}
