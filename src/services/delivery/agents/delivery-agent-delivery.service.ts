import { prisma } from "@/database/client/prisma";
import { Prisma } from "@prisma/client";

export type DeliveryAgentDeliveryScope = "ACTIVE" | "HISTORY" | "ALL";

export interface DeliveryAgentDeliveryListInput {
  agentId: string;
  organizationId: string;
  scope?: DeliveryAgentDeliveryScope;
  limit?: number;
  offset?: number;
}

export interface DeliveryAgentDeliveryItem {
  dispatchId: string;
  fulfillmentId: string;
  orderId: string;
  dispatchStatus: string;
  fulfillmentStatus: string;
  exceptionCode?: string;
  acceptedAt: Date;
  updatedAt: Date;
  order: {
    status: string;
    total: string;
    currency: string;
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    deliveryInstructions?: string;
  };
  store?: {
    id: string;
    name: string;
  };
}

export interface DeliveryAgentDeliveryListResult {
  items: DeliveryAgentDeliveryItem[];
  total: number;
  limit: number;
  offset: number;
  scope: DeliveryAgentDeliveryScope;
}

export class DeliveryAgentDeliveryService {
  async list(
    input: DeliveryAgentDeliveryListInput,
  ): Promise<DeliveryAgentDeliveryListResult> {
    if (!input.agentId.trim()) {
      throw new Error("DELIVERY_AGENT_REQUIRED");
    }

    if (!input.organizationId.trim()) {
      throw new Error("DELIVERY_AGENT_ORGANIZATION_REQUIRED");
    }

    const scope = input.scope ?? "ACTIVE";
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const offset = Math.max(input.offset ?? 0, 0);

    const fulfillmentWhere: Prisma.FulfillmentRequestWhereInput =
      scope === "ACTIVE"
        ? {
            status: {
              in: [
                "ASSIGNED",
                "PREPARING",
                "READY_FOR_PICKUP",
                "PICKED_UP",
                "IN_TRANSIT",
                "EXCEPTION",
              ],
            },
          }
        : scope === "HISTORY"
          ? { status: { in: ["COMPLETED", "CANCELLED"] } }
          : {};

    const dispatchWhere: Prisma.DispatchRequestWhereInput = {
      organizationId: input.organizationId,
      serviceType: "DELIVERY",
      acceptedAgentId: input.agentId,
      ...(scope === "ACTIVE"
        ? { status: "ACCEPTED" }
        : scope === "HISTORY"
          ? { status: { in: ["COMPLETED", "CANCELLED", "EXPIRED"] } }
          : {}),
    };

    const [dispatches, total] = await Promise.all([
      prisma.dispatchRequest.findMany({
        where: dispatchWhere,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          subjectType: true,
          subjectId: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.dispatchRequest.count({ where: dispatchWhere }),
    ]);

    const fulfillmentIds = dispatches
      .filter((dispatch) => dispatch.subjectType === "FULFILLMENT")
      .map((dispatch) => dispatch.subjectId);

    if (fulfillmentIds.length === 0) {
      return { items: [], total, limit, offset, scope };
    }

    const fulfillments = await prisma.fulfillmentRequest.findMany({
      where: {
        id: { in: fulfillmentIds },
        organizationId: input.organizationId,
        assignedAgentId: input.agentId,
        ...fulfillmentWhere,
      },
      select: {
        id: true,
        orderId: true,
        status: true,
        exceptionCode: true,
        updatedAt: true,
      },
    });

    const orderIds = Array.from(
      new Set(fulfillments.map((fulfillment) => fulfillment.orderId)),
    );

    const orders =
      orderIds.length > 0
        ? await prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
              id: true,
              status: true,
              total: true,
              currency: true,
              deliveryAddress: true,
              deliveryLatitude: true,
              deliveryLongitude: true,
              deliveryInstructions: true,
              items: {
                select: { storeId: true },
                take: 1,
              },
            },
          })
        : [];

    const assignments = await prisma.fulfillmentAssignment.findMany({
      where: {
        fulfillmentId: { in: fulfillmentIds },
        agentId: input.agentId,
      },
      select: {
        fulfillmentId: true,
        acceptedAt: true,
      },
    });

    const fulfillmentById = new Map(
      fulfillments.map((fulfillment) => [fulfillment.id, fulfillment]),
    );
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const assignmentByFulfillmentId = new Map(
      assignments.map((assignment) => [assignment.fulfillmentId, assignment]),
    );

    const storeIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          order.items
            .map((item) => item.storeId)
            .filter((storeId): storeId is string => Boolean(storeId)),
        ),
      ),
    );

    const stores =
      storeIds.length > 0
        ? await prisma.store.findMany({
            where: { id: { in: storeIds } },
            select: { id: true, name: true },
          })
        : [];

    const storeById = new Map(stores.map((store) => [store.id, store]));
    const items: DeliveryAgentDeliveryItem[] = [];

    for (const dispatch of dispatches) {
      if (dispatch.subjectType !== "FULFILLMENT") {
        continue;
      }

      const fulfillment = fulfillmentById.get(dispatch.subjectId);
      const assignment = fulfillment
        ? assignmentByFulfillmentId.get(fulfillment.id)
        : undefined;
      const order = fulfillment
        ? orderById.get(fulfillment.orderId)
        : undefined;

      if (!fulfillment || !assignment?.acceptedAt || !order) {
        continue;
      }

      const storeId = order.items[0]?.storeId;
      const store = storeId ? storeById.get(storeId) : undefined;

      items.push({
        dispatchId: dispatch.id,
        fulfillmentId: fulfillment.id,
        orderId: fulfillment.orderId,
        dispatchStatus: dispatch.status,
        fulfillmentStatus: fulfillment.status,
        exceptionCode: fulfillment.exceptionCode ?? undefined,
        acceptedAt: assignment.acceptedAt,
        updatedAt:
          dispatch.updatedAt > fulfillment.updatedAt
            ? dispatch.updatedAt
            : fulfillment.updatedAt,
        order: {
          status: order.status,
          total: order.total.toString(),
          currency: order.currency,
          deliveryAddress: order.deliveryAddress ?? undefined,
          deliveryLatitude:
            order.deliveryLatitude === null
              ? undefined
              : Number(order.deliveryLatitude),
          deliveryLongitude:
            order.deliveryLongitude === null
              ? undefined
              : Number(order.deliveryLongitude),
          deliveryInstructions: order.deliveryInstructions ?? undefined,
        },
        store,
      });
    }

    return { items, total, limit, offset, scope };
  }
}

export const deliveryAgentDeliveryService =
  new DeliveryAgentDeliveryService();
