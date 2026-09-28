import { OrderStatus as PrismaOrderStatus } from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  OrderStatus,
  CreateOrderInput,
  OrderSummary,
} from "./types/order.types";

export class OrderService {
  async createOrder(
    input: CreateOrderInput
  ) {
    if (!input.userId.trim()) {
      throw new Error("User is required.");
    }

    if (!input.cartId.trim()) {
      throw new Error("Cart is required.");
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      throw new Error(
        "Order must contain at least one item."
      );
    }

    if (
      !Number.isFinite(input.total) ||
      input.total <= 0
    ) {
      throw new Error(
        "Order total must be greater than zero."
      );
    }

    const productIds = [
      ...new Set(
        input.items.map((item) =>
          item.productId.trim()
        )
      ),
    ];

    if (
      productIds.some(
        (productId) => !productId
      )
    ) {
      throw new Error(
        "Order contains an invalid product."
      );
    }

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          status: "ACTIVE",
        },
        include: {
          store: {
            select: {
              id: true,
              vendorId: true,
            },
          },
        },
      });

    const productsById =
      new Map(
        products.map((product) => [
          product.id,
          product,
        ])
      );

    for (const item of input.items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Order contains an invalid quantity."
        );
      }

      const product =
        productsById.get(
          item.productId
        );

      if (!product) {
        throw new Error(
          `Product "${item.productId}" is not available.`
        );
      }

      if (
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        throw new Error(
          `Invalid price for product "${item.productId}".`
        );
      }
    }

    const order =
      await prisma.$transaction(
        async (database) => {
          return database.order.create({
            data: {
              userId: input.userId,
              status:
                PrismaOrderStatus.PENDING,
              total: input.total,
              currency: "AOA",
              items: {
                create:
                  input.items.map(
                    (item) => {
                      const product =
                        productsById.get(
                          item.productId
                        );

                      if (!product) {
                        throw new Error(
                          `Product "${item.productId}" is not available.`
                        );
                      }

                      const subtotal =
                        item.price *
                        item.quantity;

                      return {
                        productId:
                          item.productId,
                        storeId:
                          product.storeId,
                        vendorId:
                          product.store
                            .vendorId,
                        quantity:
                          item.quantity,
                        unitPrice:
                          item.price,
                        subtotal,
                      };
                    }
                  ),
              },
            },
            include: {
              items: true,
            },
          });
        }
      );

    return {
      id: order.id,
      userId: order.userId,
      status:
        order.status as OrderStatus,
      total:
        Number(order.total),
      currency:
        order.currency,
      items:
        order.items.map(
          (item) => ({
            id: item.id,
            productId:
              item.productId,
            storeId:
              item.storeId,
            vendorId:
              item.vendorId,
            quantity:
              item.quantity,
            unitPrice:
              Number(item.unitPrice),
            subtotal:
              Number(item.subtotal),
          })
        ),
      createdAt:
        order.createdAt,
    };
  }

  async getUserOrders(
    userId: string
  ): Promise<OrderSummary[]> {
    if (!userId.trim()) {
      throw new Error(
        "User is required."
      );
    }

    const orders =
      await prisma.order.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true,
          createdAt: true,
        },
      });

    return orders.map(
      (order) => ({
        id: order.id,
        userId:
          order.userId,
        status:
          order.status as OrderStatus,
        total:
          Number(order.total),
        createdAt:
          order.createdAt,
      })
    );
  }

  async getOrderById(
    orderId: string,
    userId?: string
  ) {
    if (!orderId.trim()) {
      throw new Error(
        "Order id is required."
      );
    }

    const order =
      await prisma.order.findFirst({
        where: {
          id: orderId,
          ...(userId
            ? {
                userId,
              }
            : {}),
        },
        include: {
          items: true,
          payments: true,
          fulfillment: {
            include: {
              assignment: true,
            },
          },
        },
      });

    if (!order) {
      throw new Error(
        "Order not found."
      );
    }

    const dispatch = order.fulfillment
      ? await prisma.dispatchRequest.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: "FULFILLMENT",
              subjectId: order.fulfillment.id,
            },
          },
          select: {
            id: true,
            status: true,
            serviceType: true,
            assignedAgentId: true,
            originLatitude: true,
            originLongitude: true,
            destinationLatitude: true,
            destinationLongitude: true,
            candidatePolicyRef: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null;

    return {
      id: order.id,
      userId:
        order.userId,
      status:
        order.status as OrderStatus,
      total:
        Number(order.total),
      currency:
        order.currency,
      createdAt:
        order.createdAt,
      updatedAt:
        order.updatedAt,
      items:
        order.items.map(
          (item) => ({
            id: item.id,
            productId:
              item.productId,
            storeId:
              item.storeId,
            vendorId:
              item.vendorId,
            quantity:
              item.quantity,
            unitPrice:
              Number(item.unitPrice),
            subtotal:
              Number(item.subtotal),
          })
        ),
      fulfillment: order.fulfillment
        ? {
            id: order.fulfillment.id,
            status: order.fulfillment.status,
            assignedAgentId:
              order.fulfillment.assignedAgentId,
            exceptionCode:
              order.fulfillment.exceptionCode,
            assignment:
              order.fulfillment.assignment
                ? {
                    agentId:
                      order.fulfillment.assignment.agentId,
                    assignedAt:
                      order.fulfillment.assignment.assignedAt,
                    acceptedAt:
                      order.fulfillment.assignment.acceptedAt,
                  }
                : null,
          }
        : null,
      dispatch: dispatch
        ? {
            id: dispatch.id,
            status: dispatch.status,
            serviceType: dispatch.serviceType,
            assignedAgentId:
              dispatch.assignedAgentId,
            origin: {
              latitude:
                Number(dispatch.originLatitude),
              longitude:
                Number(dispatch.originLongitude),
            },
            destination:
              dispatch.destinationLatitude !== null &&
              dispatch.destinationLongitude !== null
                ? {
                    latitude:
                      Number(dispatch.destinationLatitude),
                    longitude:
                      Number(dispatch.destinationLongitude),
                  }
                : null,
            candidatePolicyRef:
              dispatch.candidatePolicyRef,
            createdAt: dispatch.createdAt,
            updatedAt: dispatch.updatedAt,
          }
        : null,
      payments:
        order.payments.map(
          (payment) => ({
            id: payment.id,
            transactionId:
              payment.transactionId,
            amount:
              Number(
                payment.amountMinor
              ),
            currency:
              payment.currency,
            status:
              payment.status,
            provider:
              payment.provider,
            providerPaymentId:
              payment.providerPaymentId,
          })
        ),
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ) {
    if (!orderId.trim()) {
      throw new Error(
        "Order id is required."
      );
    }

    const allowedStatuses =
      new Set<OrderStatus>([
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ]);

    if (
      !allowedStatuses.has(status)
    ) {
      throw new Error(
        `Unsupported order status: ${status}.`
      );
    }

    const existingOrder =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!existingOrder) {
      throw new Error(
        "Order not found."
      );
    }

    const prismaStatus =
      status as unknown as PrismaOrderStatus;

    const updatedOrder =
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: prismaStatus,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return {
      id: updatedOrder.id,
      userId:
        updatedOrder.userId,
      status:
        updatedOrder.status as OrderStatus,
      total:
        Number(updatedOrder.total),
      currency:
        updatedOrder.currency,
      createdAt:
        updatedOrder.createdAt,
      updatedAt:
        updatedOrder.updatedAt,
    };
  }
}

export const orderService =
  new OrderService();
