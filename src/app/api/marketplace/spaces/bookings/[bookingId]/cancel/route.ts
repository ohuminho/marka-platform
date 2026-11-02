import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const cancelSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120).regex(/^[a-zA-Z0-9:_-]+$/),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) {
      return NextResponse.json(
        { message: "Inicie sessão para cancelar a reserva.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "A conta não está ativa.", code: "USER_NOT_ACTIVE" },
        { status: 403 }
      );
    }

    const parsed = cancelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Indique uma chave de pedido válida e, opcionalmente, o motivo.", code: "INVALID_CANCELLATION_REQUEST" },
        { status: 400 }
      );
    }

    const { bookingId } = await context.params;
    if (!z.string().uuid().safeParse(bookingId).success) {
      return NextResponse.json(
        { message: "Reserva não encontrada.", code: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }

    const eventKey = `space-booking-cancel:${user.id}:${parsed.data.idempotencyKey}`;

    const result = await prisma.$transaction(async (tx) => {
      const previousEvent = await tx.spaceBookingEvent.findUnique({
        where: { idempotencyKey: eventKey },
        include: { booking: true },
      });
      if (previousEvent) {
        if (previousEvent.bookingId !== bookingId) {
          return { kind: "IDEMPOTENCY_CONFLICT" as const };
        }
        return { kind: "DUPLICATE" as const, booking: previousEvent.booking };
      }

      const booking = await tx.spaceBooking.findFirst({
        where: {
          id: bookingId,
          OR: [
            { customerId: user.id },
            { product: { store: { vendor: { ownerId: user.id } } } },
          ],
        },
        select: {
          id: true,
          reference: true,
          status: true,
          customerId: true,
          payment: { select: { id: true, status: true } },
        },
      });

      if (!booking) return { kind: "NOT_FOUND" as const };

      if (booking.status === "CANCELLED") {
        return { kind: "ALREADY_CANCELLED" as const, booking };
      }

      // Until reservation payments and refunds are connected to the PSP flow,
      // only unpaid requests and owner-accepted quotes can be cancelled here.
      if (
        booking.payment ||
        (booking.status !== "REQUESTED" && booking.status !== "ACCEPTED")
      ) {
        return { kind: "PAYMENT_LIFECYCLE_REQUIRED" as const };
      }

      const updatedCount = await tx.spaceBooking.updateMany({
        where: {
          id: booking.id,
          status: booking.status,
          payment: { is: null },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });
      if (updatedCount.count !== 1) {
        return { kind: "STATE_CONFLICT" as const };
      }

      const updated = await tx.spaceBooking.findUniqueOrThrow({
        where: { id: booking.id },
      });

      await tx.spaceBookingEvent.create({
        data: {
          bookingId: booking.id,
          actorUserId: user.id,
          action: booking.customerId === user.id ? "CUSTOMER_CANCELLED" : "OWNER_CANCELLED",
          fromStatus: booking.status,
          toStatus: "CANCELLED",
          idempotencyKey: eventKey,
          metadata: {
            reason: parsed.data.reason || null,
            actorRole: booking.customerId === user.id ? "CUSTOMER" : "OWNER",
            paymentPresent: false,
          },
        },
      });

      return { kind: "CANCELLED" as const, booking: updated };
    }, { isolationLevel: "Serializable" });

    if (result.kind === "NOT_FOUND") {
      return NextResponse.json(
        { message: "Reserva não encontrada nesta conta.", code: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (result.kind === "IDEMPOTENCY_CONFLICT") {
      return NextResponse.json(
        { message: "A chave de idempotência já foi utilizada noutro pedido.", code: "IDEMPOTENCY_CONFLICT" },
        { status: 409 }
      );
    }
    if (result.kind === "PAYMENT_LIFECYCLE_REQUIRED") {
      return NextResponse.json(
        { message: "Esta reserva exige o fluxo integrado de pagamento e reembolso. Não foi alterada.", code: "PAYMENT_LIFECYCLE_REQUIRED" },
        { status: 409 }
      );
    }
    if (result.kind === "STATE_CONFLICT") {
      return NextResponse.json(
        { message: "A reserva foi alterada em simultâneo. Atualize o estado antes de tentar novamente.", code: "BOOKING_STATE_CONFLICT" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      booking: {
        id: result.booking.id,
        reference: result.booking.reference,
        status: result.booking.status,
        cancelledAt: result.booking.cancelledAt,
      },
      duplicate: result.kind === "DUPLICATE",
      message: result.kind === "DUPLICATE"
        ? "Este cancelamento já tinha sido processado."
        : result.kind === "ALREADY_CANCELLED"
          ? "A reserva já estava cancelada."
          : "Reserva cancelada. Nenhum pagamento ou reembolso foi iniciado.",
    }, {
      status: result.kind === "CANCELLED" ? 200 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[SPACE_BOOKING_CANCEL_POST]", error);
    return NextResponse.json(
      { message: "Não foi possível cancelar a reserva.", code: "SPACE_BOOKING_CANCEL_FAILED" },
      { status: 500 }
    );
  }
}
