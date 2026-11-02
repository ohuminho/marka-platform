import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  productId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  participantCount: z.number().int().min(1).max(1000),
  timezone: z.string().trim().min(1).max(80),
  customerNote: z.string().trim().max(1500).optional().default(""),
  idempotencyKey: z.string().trim().min(12).max(120),
});

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayLabel);
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}`,
    weekday,
  };
}

function validTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}


export async function GET(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) {
      return NextResponse.json({ message: "Inicie sessão para consultar as reservas.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "A conta não está ativa.", code: "USER_NOT_ACTIVE" }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const allowedStatuses = ["REQUESTED", "ACCEPTED", "DECLINED", "PAYMENT_PENDING", "CONFIRMED", "CANCELLED", "EXPIRED", "COMPLETED"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ message: "Estado de reserva inválido.", code: "INVALID_BOOKING_STATUS" }, { status: 400 });
    }

    const bookings = await prisma.spaceBooking.findMany({
      where: {
        AND: [
          { OR: [{ customerId: user.id }, { product: { store: { vendor: { ownerId: user.id } } } }] },
          ...(status ? [{ status: status as "REQUESTED" | "ACCEPTED" | "DECLINED" | "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" }] : []),
        ],
      },
      include: {
        product: {
          select: { id: true, name: true, store: { select: { vendor: { select: { ownerId: true, name: true } } } } },
        },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      bookings: bookings.map((booking) => {
        const isOwner = booking.product.store.vendor.ownerId === user.id;
        return {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          startAt: booking.startAt,
          endAt: booking.endAt,
          timezone: booking.timezone,
          participantCount: booking.participantCount,
          totalAmount: booking.totalAmount.toString(),
          currency: booking.currency,
          product: { id: booking.product.id, name: booking.product.name },
          customer: isOwner ? { name: booking.customer.name } : undefined,
          providerName: booking.product.store.vendor.name,
          customerNote: isOwner || booking.customerId === user.id ? booking.customerNote : null,
          ownerNote: isOwner || booking.customerId === user.id ? booking.ownerNote : null,
          createdAt: booking.createdAt,
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[SPACE_BOOKINGS_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar as reservas.", code: "SPACE_BOOKINGS_LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) {
      return NextResponse.json({ message: "Inicie sessão para pedir uma reserva.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "A conta não está ativa.", code: "USER_NOT_ACTIVE" }, { status: 403 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({
        message: "Verifique o anúncio, período, participantes e chave do pedido.",
        code: "INVALID_BOOKING_REQUEST",
        errors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const input = parsed.data;
    if (!validTimeZone(input.timezone)) {
      return NextResponse.json({ message: "Fuso horário inválido.", code: "INVALID_TIMEZONE" }, { status: 400 });
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    const now = new Date();
    const durationMs = endAt.getTime() - startAt.getTime();
    if (startAt <= now || durationMs < 30 * 60 * 1000 || durationMs > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ message: "A reserva deve começar no futuro e durar entre 30 minutos e 24 horas.", code: "INVALID_BOOKING_INTERVAL" }, { status: 400 });
    }

    const localStart = localParts(startAt, input.timezone);
    const localEnd = localParts(endAt, input.timezone);
    if (localStart.date !== localEnd.date || localStart.weekday < 0) {
      return NextResponse.json({ message: "Por enquanto, a reserva deve decorrer no mesmo dia local do espaço.", code: "CROSS_DAY_BOOKING_NOT_SUPPORTED" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: input.productId,
        status: "ACTIVE",
        store: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
        category: { name: { equals: "Imóveis e arrendamento", mode: "insensitive" }, status: "ACTIVE" },
      },
      select: {
        id: true, name: true, price: true, currency: true, attributes: true,
        store: { select: { vendor: { select: { ownerId: true, name: true } } } },
      },
    });
    if (!product) {
      return NextResponse.json({ message: "Espaço não encontrado ou indisponível.", code: "SPACE_NOT_FOUND" }, { status: 404 });
    }
    if (product.store.vendor.ownerId === user.id) {
      return NextResponse.json({ message: "Não pode reservar o seu próprio anúncio.", code: "SELF_BOOKING_NOT_ALLOWED" }, { status: 409 });
    }

    const attributes = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
      ? product.attributes as Record<string, unknown>
      : {};
    const eligibleSpaceTypes = ["sala de reuniões", "sala de conferências", "sala de formação", "coworking", "espaço para eventos"];
    const propertyType = String(attributes.propertyType ?? "").trim().toLocaleLowerCase();
    if ((attributes.spaceBookingEnabled !== true && attributes.spaceBookingEnabled !== "true") || !eligibleSpaceTypes.includes(propertyType)) {
      return NextResponse.json({ message: "Este anúncio não está configurado para reservas de espaços.", code: "SPACE_BOOKING_NOT_ENABLED" }, { status: 404 });
    }
    const rawCapacity = attributes.capacity ?? attributes.participantCapacity;
    const capacity = rawCapacity == null ? null : Number(String(rawCapacity).replace(/[^0-9.]/g, ""));
    if (capacity !== null && Number.isFinite(capacity) && input.participantCount > capacity) {
      return NextResponse.json({ message: "O número de participantes excede a capacidade indicada no anúncio.", code: "CAPACITY_EXCEEDED" }, { status: 409 });
    }

    const [rules, exceptions] = await Promise.all([
      prisma.spaceAvailabilityRule.findMany({
        where: { productId: product.id, isActive: true },
        select: { weekday: true, startTime: true, endTime: true, timezone: true, activeFrom: true, activeUntil: true },
      }),
      prisma.spaceAvailabilityException.findMany({
        where: { productId: product.id, startAt: { lt: endAt }, endAt: { gt: startAt } },
        select: { type: true, startAt: true, endAt: true },
      }),
    ]);

    if (rules.some((rule) => rule.timezone !== input.timezone)) {
      return NextResponse.json({ message: "O fuso horário deve corresponder ao definido pelo proprietário.", code: "TIMEZONE_MISMATCH" }, { status: 409 });
    }

    const closedConflict = exceptions.some((exception) =>
      exception.type === "CLOSED" && exception.startAt < endAt && exception.endAt > startAt
    );
    if (closedConflict) {
      return NextResponse.json({ message: "O espaço está indisponível nesse período.", code: "SPACE_CLOSED" }, { status: 409 });
    }

    const openExceptionCovers = exceptions.some((exception) =>
      exception.type === "OPEN" && exception.startAt <= startAt && exception.endAt >= endAt
    );
    const matchingRule = rules.some((rule) => {
      const activeDate = (!rule.activeFrom || localStart.date >= rule.activeFrom.toISOString().slice(0, 10)) &&
        (!rule.activeUntil || localStart.date <= rule.activeUntil.toISOString().slice(0, 10));
      return activeDate && rule.weekday === localStart.weekday &&
        rule.startTime <= localStart.time && rule.endTime >= localEnd.time;
    });
    if (!matchingRule && !openExceptionCovers) {
      return NextResponse.json({ message: "O período solicitado não está dentro dos horários disponibilizados pelo proprietário.", code: "OUTSIDE_AVAILABILITY" }, { status: 409 });
    }

    const reference = `MS-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const eventKey = `space-booking-request:${user.id}:${input.idempotencyKey}`;

    const result = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.spaceBookingEvent.findUnique({
        where: { idempotencyKey: eventKey },
        include: { booking: true },
      });
      if (existingEvent) return { booking: existingEvent.booking, duplicate: true };

      const booking = await tx.spaceBooking.create({
        data: {
          reference,
          productId: product.id,
          customerId: user.id,
          status: "REQUESTED",
          startAt,
          endAt,
          timezone: input.timezone,
          participantCount: input.participantCount,
          currency: product.currency || "AOA",
          // No amount is charged or guessed at request time. The owner must confirm
          // the final quote before a payment intent can be created.
          totalAmount: new Prisma.Decimal(0),
          priceSnapshot: {
            pricingStatus: "OWNER_QUOTE_REQUIRED",
            listedPrice: product.price.toString(),
            currency: product.currency || "AOA",
            listingName: product.name,
          },
          customerNote: input.customerNote || null,
        },
      });

      await tx.spaceBookingEvent.create({
        data: {
          bookingId: booking.id,
          actorUserId: user.id,
          action: "CUSTOMER_REQUESTED",
          toStatus: "REQUESTED",
          idempotencyKey: eventKey,
          metadata: { participantCount: input.participantCount, timezone: input.timezone },
        },
      });

      return { booking, duplicate: false };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      booking: {
        id: result.booking.id,
        reference: result.booking.reference,
        status: result.booking.status,
        startAt: result.booking.startAt,
        endAt: result.booking.endAt,
        timezone: result.booking.timezone,
        participantCount: result.booking.participantCount,
        currency: result.booking.currency,
        pricingStatus: "OWNER_QUOTE_REQUIRED",
      },
      duplicate: result.duplicate,
      message: result.duplicate ? "Este pedido já tinha sido recebido." : "Pedido enviado ao proprietário. Ainda não existe pagamento nem confirmação.",
    }, { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json({ message: "Este pedido já foi processado.", code: "DUPLICATE_BOOKING_REQUEST" }, { status: 409 });
    }
    console.error("[SPACE_BOOKING_REQUEST_POST]", error);
    return NextResponse.json({ message: "Não foi possível criar o pedido de reserva.", code: "SPACE_BOOKING_REQUEST_FAILED" }, { status: 500 });
  }
}
