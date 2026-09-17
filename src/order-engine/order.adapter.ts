import type {
  EntityRef,
  PolicyContext,
} from "@/core/domain/contracts";
import type {
  OrderAggregate,
  OrderCommand,
} from "@/order-engine/order.contracts";
import { prisma } from "@/database/client/prisma";

export interface OrderCreateCommand {
  organizationId: string;
  buyer: EntityRef;
  seller?: EntityRef;
  lines: OrderAggregate["lines"];
  subtotal: number;
  total: number;
  currency: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export class OrderAdapter {
  async getOrder(
    orderId: string,
    context: PolicyContext,
  ): Promise<OrderAggregate | null> {
    if (!orderId.trim()) {
      throw new Error("Order is required.");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      organizationId: context.organizationId,
      status: this.mapStatus(order.status),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      buyer: {
        id: order.userId,
        type: "USER",
      },
      lines: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: {
          amountMinor: Number(item.unitPrice),
          currency: context.currency,
        },
        total: {
          amountMinor: Number(item.subtotal),
          currency: context.currency,
        },
      })),
      subtotal: {
        amountMinor: Number(order.total),
        currency: context.currency,
      },
      fees: [],
      total: {
        amountMinor: Number(order.total),
        currency: context.currency,
      },
    };
  }

  async cancel(
    orderId: string,
    reason: string,
    context: PolicyContext,
  ): Promise<OrderCommand> {
    const order = await this.getOrder(orderId, context);

    if (!order) {
      throw new Error("Order not found.");
    }

    if (
      order.status === "COMPLETED" ||
      order.status === "REFUNDED" ||
      order.status === "CANCELLED"
    ) {
      throw new Error("Order cannot be cancelled in its current state.");
    }

    return {
      orderId,
      reason,
      metadata: {
        organizationId: context.organizationId,
      },
    };
  }

  private mapStatus(status: string): OrderAggregate["status"] {
    switch (status) {
      case "PENDING":
        return "PENDING";
      case "CONFIRMED":
        return "CONFIRMED";
      case "PROCESSING":
        return "PROCESSING";
      case "DELIVERED":
        return "COMPLETED";
      case "REFUNDED":
        return "REFUNDED";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "PENDING";
    }
  }
}

export const orderAdapter = new OrderAdapter();
