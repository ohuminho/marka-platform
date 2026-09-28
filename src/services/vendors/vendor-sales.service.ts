import { prisma } from "@/database/client/prisma";
import { orderService } from "@/services/orders/order.service";
import { OrderTransitionError } from "@/services/orders/order.state-machine";
import type { OrderStatus } from "@prisma/client";

export class VendorSalesService {
  async listSales({
    userId,
    organizationId,
    status,
    limit = 50,
    offset = 0,
  }: {
    userId: string;
    organizationId: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: userId, organizationId },
      select: { id: true },
    });

    if (!vendor) throw new Error("VENDOR_NOT_FOUND");

    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
    const safeOffset = Math.max(Math.floor(offset), 0);
    const normalizedStatus = status?.trim().toUpperCase();

    const where = {
      items: { some: { vendorId: vendor.id } },
      ...(normalizedStatus ? { status: normalizedStatus as OrderStatus } : {}),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: safeOffset,
        take: safeLimit,
        include: {
          items: {
            where: { vendorId: vendor.id },
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          fulfillment: {
            select: { id: true, status: true, exceptionCode: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        currency: order.currency,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        fulfillment: order.fulfillment,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
        })),
      })),
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async updateSaleStatus({
    userId,
    organizationId,
    orderId,
    status,
  }: {
    userId: string;
    organizationId: string;
    orderId: string;
    status: OrderStatus;
  }) {
    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: userId, organizationId },
      select: { id: true },
    });

    if (!vendor) throw new Error("VENDOR_NOT_FOUND");

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: { some: { vendorId: vendor.id } },
      },
      select: {
        id: true,
        status: true,
        fulfillment: { select: { id: true, status: true } },
      },
    });

    if (!order) throw new Error("ORDER_NOT_FOUND");

    try {
      const updated = await orderService.updateOrderStatus(
        order.id,
        status as unknown as import("@/services/orders/types/order.types").OrderStatus,
        userId,
      );

      return {
        ...updated,
        fulfillment: order.fulfillment,
      };
    } catch (error) {
      if (error instanceof OrderTransitionError) {
        throw new Error(
          "INVALID_VENDOR_ORDER_TRANSITION:" +
          order.status +
          ":" +
          status,
        );
      }
      throw error;
    }
  }
}

export const vendorSalesService = new VendorSalesService();
