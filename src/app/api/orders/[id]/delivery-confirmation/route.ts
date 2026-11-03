import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session.", code: "INVALID_SESSION" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const orderId = id.trim();
    if (!orderId) {
      return NextResponse.json(
        { message: "Order id is required.", code: "ORDER_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (database) => {
      const order = await database.order.findFirst({
        where: { id: orderId, userId: session.userId },
        select: {
          id: true,
          fulfillment: {
            select: {
              id: true,
              status: true,
              metadata: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const fulfillment = order.fulfillment;
      if (!fulfillment) {
        throw new Error("FULFILLMENT_NOT_FOUND");
      }

      if (fulfillment.status === "COMPLETED") {
        const metadata =
          fulfillment.metadata &&
          typeof fulfillment.metadata === "object" &&
          !Array.isArray(fulfillment.metadata)
            ? fulfillment.metadata as Record<string, unknown>
            : {};
        const proof =
          metadata.deliveryProof &&
          typeof metadata.deliveryProof === "object" &&
          !Array.isArray(metadata.deliveryProof)
            ? metadata.deliveryProof as Record<string, unknown>
            : {};

        if (proof.method === "CUSTOMER_CONFIRMATION") {
          return { confirmed: true, alreadyCompleted: true };
        }
      }

      if (fulfillment.status !== "IN_TRANSIT") {
        throw new Error("DELIVERY_NOT_IN_TRANSIT");
      }

      const metadata =
        fulfillment.metadata &&
        typeof fulfillment.metadata === "object" &&
        !Array.isArray(fulfillment.metadata)
          ? fulfillment.metadata as Record<string, unknown>
          : {};
      const existingProof =
        metadata.deliveryProof &&
        typeof metadata.deliveryProof === "object" &&
        !Array.isArray(metadata.deliveryProof)
          ? metadata.deliveryProof as Record<string, unknown>
          : {};

      if (
        existingProof.method === "CUSTOMER_CONFIRMATION" &&
        typeof existingProof.confirmedAt === "string"
      ) {
        return { confirmed: true, alreadyCompleted: false };
      }

      await database.fulfillmentRequest.updateMany({
        where: {
          id: fulfillment.id,
          status: "IN_TRANSIT",
        },
        data: {
          metadata: {
            ...metadata,
            deliveryProof: {
              method: "CUSTOMER_CONFIRMATION",
              confirmedAt: new Date().toISOString(),
              confirmedBy: session.userId,
              source: "CUSTOMER_ORDER_PORTAL",
            },
          },
        },
      });

      const refreshed = await database.fulfillmentRequest.findUnique({
        where: { id: fulfillment.id },
        select: { status: true, metadata: true },
      });

      const refreshedMetadata =
        refreshed?.metadata &&
        typeof refreshed.metadata === "object" &&
        !Array.isArray(refreshed.metadata)
          ? refreshed.metadata as Record<string, unknown>
          : {};
      const refreshedProof =
        refreshedMetadata.deliveryProof &&
        typeof refreshedMetadata.deliveryProof === "object" &&
        !Array.isArray(refreshedMetadata.deliveryProof)
          ? refreshedMetadata.deliveryProof as Record<string, unknown>
          : {};

      if (
        refreshed?.status !== "IN_TRANSIT" ||
        refreshedProof.method !== "CUSTOMER_CONFIRMATION"
      ) {
        throw new Error("DELIVERY_CONFIRMATION_CONFLICT");
      }

      return { confirmed: true, alreadyCompleted: false };
    });

    return NextResponse.json({ confirmation: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DELIVERY_CONFIRMATION_FAILED";
    const status =
      code === "ORDER_NOT_FOUND" || code === "FULFILLMENT_NOT_FOUND"
        ? 404
        : code === "DELIVERY_NOT_IN_TRANSIT" || code === "DELIVERY_CONFIRMATION_CONFLICT"
          ? 409
          : 500;

    if (status === 500) {
      console.error("[DELIVERY_CONFIRMATION_ERROR]", error);
    }

    return NextResponse.json(
      { message: "Unable to confirm delivery.", code },
      { status },
    );
  }
}
