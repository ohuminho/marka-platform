import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("accept"),
    quoteAmount: z.string().trim().regex(/^\d{1,15}(\.\d{1,4})?$/),
    ownerNote: z.string().trim().max(1500).optional().default(""),
    idempotencyKey: z.string().trim().min(12).max(120),
  }),
  z.object({
    decision: z.literal("decline"),
    ownerNote: z.string().trim().min(2).max(1500),
    idempotencyKey: z.string().trim().min(12).max(120),
  }),
]);

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

function isBookingConflict(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return code === "P2004" || message.includes("SpaceBooking_no_overlapping_active_slots") || message.includes("23P01");
}

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicie sessão.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
    if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "Conta não ativa.", code: "USER_NOT_ACTIVE" }, { status: 403 });

    const { bookingId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return NextResponse.json({ message: "Pedido de reserva inválido.", code: "INVALID_BOOKING_ID" }, { status: 400 });
    }
    const parsed = decisionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Dados de decisão inválidos.", code: "INVALID_BOOKING_DECISION", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const input = parsed.data;

    const booking = await prisma.spaceBooking.findFirst({
      where: { id: bookingId, product: { store: { vendor: { ownerId: user.id } } } },
      select: { id: true, status: true, startAt: true, endAt: true, currency: true, priceSnapshot: true, product: { select: { name: true } } },
    });
    if (!booking) return NextResponse.json({ message: "Reserva não encontrada para esta conta comercial.", code: "BOOKING_NOT_FOUND" }, { status: 404 });
    if (booking.status !== "REQUESTED") {
      return NextResponse.json({ message: "Este pedido já foi tratado e não pode receber outra decisão.", code: "BOOKING_NOT_PENDING" }, { status: 409 });
    }
    if (booking.startAt <= new Date()) {
      return NextResponse.json({ message: "O horário solicitado já passou.", code: "BOOKING_EXPIRED" }, { status: 409 });
    }

    const eventKey = `space-booking-owner:${user.id}:${booking.id}:${input.idempotencyKey}`;
    const nextStatus = input.decision === "accept" ? "ACCEPTED" : "DECLINED";

    const result = await prisma.$transaction(async (tx) => {
      const priorEvent = await tx.spaceBookingEvent.findUnique({ where: { idempotencyKey: eventKey }, include: { booking: true } });
      if (priorEvent) return { booking: priorEvent.booking, duplicate: true };

      const update = await tx.spaceBooking.updateMany({
        where: { id: booking.id, status: "REQUESTED" },
        data: input.decision === "accept"
          ? {
              status: "ACCEPTED",
              acceptedAt: new Date(),
              totalAmount: new Prisma.Decimal(input.quoteAmount),
              ownerNote: input.ownerNote || null,
              priceSnapshot: {
                ...(booking.priceSnapshot && typeof booking.priceSnapshot === "object" && !Array.isArray(booking.priceSnapshot)
                  ? booking.priceSnapshot as Record<string, unknown> : {}),
                pricingStatus: "OWNER_QUOTE_SET",
                quotedAmount: input.quoteAmount,
                currency: booking.currency,
                quotedAt: new Date().toISOString(),
              },
            }
          : { status: "DECLINED", ownerNote: input.ownerNote, cancelledAt: new Date() },
      });
      if (update.count !== 1) throw new Error("BOOKING_STATE_CHANGED");

      const updatedBooking = await tx.spaceBooking.findUniqueOrThrow({ where: { id: booking.id } });
      await tx.spaceBookingEvent.create({
        data: {
          bookingId: booking.id,
          actorUserId: user.id,
          action: input.decision === "accept" ? "OWNER_ACCEPTED_WITH_QUOTE" : "OWNER_DECLINED",
          fromStatus: "REQUESTED",
          toStatus: nextStatus,
          idempotencyKey: eventKey,
          metadata: input.decision === "accept"
            ? { quoteAmount: input.quoteAmount, currency: booking.currency }
            : { reason: input.ownerNote },
        },
      });
      return { booking: updatedBooking, duplicate: false };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      booking: {
        id: result.booking.id,
        reference: result.booking.reference,
        status: result.booking.status,
        totalAmount: result.booking.totalAmount.toString(),
        currency: result.booking.currency,
        startAt: result.booking.startAt,
        endAt: result.booking.endAt,
      },
      duplicate: result.duplicate,
      message: input.decision === "accept"
        ? "Proposta aceite e preço definido. Ainda não existe cobrança nem confirmação final."
        : "Pedido recusado. Não foi efetuada qualquer cobrança.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isBookingConflict(error)) {
      return NextResponse.json({ message: "O horário já foi ocupado por outra reserva confirmada/aceite.", code: "BOOKING_SLOT_CONFLICT" }, { status: 409 });
    }
    if (isUniqueError(error)) {
      return NextResponse.json({ message: "Esta decisão já foi processada.", code: "DUPLICATE_BOOKING_DECISION" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "BOOKING_STATE_CHANGED") {
      return NextResponse.json({ message: "O pedido foi alterado por outra operação. Atualize a lista.", code: "BOOKING_STATE_CHANGED" }, { status: 409 });
    }
    console.error("[SPACE_BOOKING_OWNER_DECISION]", error);
    return NextResponse.json({ message: "Não foi possível processar a decisão.", code: "BOOKING_DECISION_FAILED" }, { status: 500 });
  }
}
