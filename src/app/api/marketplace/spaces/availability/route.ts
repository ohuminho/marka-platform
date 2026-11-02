import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  productId: z.string().uuid(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      productId: url.searchParams.get("productId"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    if (!parsed.success) {
      return NextResponse.json({ message: "Indica o anúncio e um intervalo de datas válido.", code: "INVALID_AVAILABILITY_QUERY" }, { status: 400 });
    }

    const from = new Date(parsed.data.from);
    const to = new Date(parsed.data.to);
    const now = new Date();
    if (from < now || to <= from || to.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ message: "O intervalo deve começar no futuro e não pode exceder 90 dias.", code: "INVALID_DATE_RANGE" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parsed.data.productId,
        status: "ACTIVE",
        store: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
        category: { name: { equals: "Imóveis e arrendamento", mode: "insensitive" }, status: "ACTIVE" },
      },
      select: {
        id: true, name: true, attributes: true,
        store: { select: { location: true, vendor: { select: { name: true } } } },
      },
    });
    if (!product) {
      return NextResponse.json({ message: "Espaço não encontrado ou indisponível.", code: "SPACE_NOT_FOUND" }, { status: 404 });
    }

    const [rules, exceptions, bookings] = await Promise.all([
      prisma.spaceAvailabilityRule.findMany({
        where: { productId: product.id, isActive: true },
        select: { weekday: true, startTime: true, endTime: true, timezone: true, activeFrom: true, activeUntil: true },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      }),
      prisma.spaceAvailabilityException.findMany({
        where: { productId: product.id, startAt: { lt: to }, endAt: { gt: from } },
        select: { type: true, startAt: true, endAt: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.spaceBooking.findMany({
        where: {
          productId: product.id,
          OR: [
            { status: { in: ["ACCEPTED", "CONFIRMED", "COMPLETED"] } },
            {
              status: "PAYMENT_PENDING",
              OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
            },
          ],
          startAt: { lt: to }, endAt: { gt: from },
        },
        select: { startAt: true, endAt: true },
        orderBy: { startAt: "asc" },
      }),
    ]);

    const invalidRule = rules.find((rule) => !isValidTimeZone(rule.timezone));
    if (invalidRule) {
      console.error("[SPACE_AVAILABILITY_INVALID_TIMEZONE]", { productId: product.id, timezone: invalidRule.timezone });
      return NextResponse.json({ message: "O proprietário precisa corrigir o fuso horário do espaço.", code: "INVALID_SPACE_TIMEZONE" }, { status: 409 });
    }

    const attributes = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
      ? product.attributes as Record<string, unknown>
      : {};
    if (attributes.spaceBookingEnabled !== true && attributes.spaceBookingEnabled !== "true") {
      return NextResponse.json({ message: "Este anúncio não está configurado para reservas de espaços.", code: "SPACE_BOOKING_NOT_ENABLED" }, { status: 404 });
    }

    return NextResponse.json({
      space: {
        id: product.id, name: product.name, location: product.store.location,
        providerName: product.store.vendor.name, timezone: rules[0]?.timezone ?? null,
        capacity: attributes.capacity ?? attributes.participantCapacity ?? null,
        equipment: attributes.equipment ?? [],
      },
      range: { from: from.toISOString(), to: to.toISOString() },
      rules, exceptions, occupied: bookings,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
  } catch (error) {
    console.error("[SPACE_AVAILABILITY_GET]", error);
    return NextResponse.json({ message: "Não foi possível consultar a disponibilidade do espaço.", code: "SPACE_AVAILABILITY_FAILED" }, { status: 500 });
  }
}
