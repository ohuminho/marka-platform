import { prisma } from "@/database/client/prisma";

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

const ACTIVE_FULFILLMENT_STATUSES = [
  "ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "EXCEPTION",
] as const;

const HISTORY_FULFILLMENT_STATUSES = [
  "COMPLETED",
  "CANCELLED",
] as const;

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

    const fulfillmentWhere =
      scope === "ACTIVE"
        ? { status: { in: ACTIVE_FULFILLMENT_STATUSES } }
        : scope === "HISTORY"
          ? { status: { in: HISTORY_FULFILLMENT_STATUSES } }
          : {};

    const dispatchWhere = {
      organizationId: input.organizationId,
      serviceType: "DELIVERY" as const,
      acceptedAgentId: input.agentId,
      ...(scope === "ACTIVE"
        ? { status: "ACCEPTED" as const }
        : scope === "HISTORY"
          ? { status: { in: ["COMPLETED", "CANCELLED", "EXPIRED"] as const } }
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
          acceptedAgentId: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.dispatchRequest.count({
        where: dispatchWhere,
      }),
    ]);

    const fulfillmentIds = dispatches
      .filter((dispatch) => dispatch.subjectType === "FULFILLMENT")
      .map((dispatch) => dispatch.subjectId);

    if (fulfillmentIds.length === 0) {
      return {
        items: [],
        total,
        limit,
        offset,
        scope,
      };
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
        order: {
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
              select: {
                storeId: true,
              },
              take: 1,
            },
          },
        },
        assignment: {
          select: {
            acceptedAt: true,
          },
        },
      },
    });

    const fulfillmentById = new Map(
      fulfillments.map((fulfillment) => [
        fulfillment.id,
        fulfillment,
      ]),
    );

    const storeIds = Array.from(
      new Set(
        fulfillments.flatMap((fulfillment) =>
          fulfillment.order.items
            .map((item) => item.storeId)
            .filter((storeId): storeId is string => Boolean(storeId)),
        ),
      ),
    );

    const stores =
      storeIds.length > 0
        ? await prisma.store.findMany({
            where: {
              id: { in: storeIds },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

    const storeById = new Map(
      stores.map((store) => [store.id, store]),
    );

    const items: DeliveryAgentDeliveryItem[] = [];

    for (const dispatch of dispatches) {
      if (dispatch.subjectType !== "FULFILLMENT") {
        continue;
      }

      const fulfillment = fulfillmentById.get(dispatch.subjectId);
      if (!fulfillment || !fulfillment.assignment?.acceptedAt) {
        continue;
      }

      const storeId = fulfillment.order.items[0]?.storeId;
      const store = storeId ? storeById.get(storeId) : undefined;

      items.push({
        dispatchId: dispatch.id,
        fulfillmentId: fulfillment.id,
        orderId: fulfillment.orderId,
        dispatchStatus: dispatch.status,
        fulfillmentStatus: fulfillment.status,
        exceptionCode: fulfillment.exceptionCode ?? undefined,
        acceptedAt: fulfillment.assignment.acceptedAt,
        updatedAt:
          dispatch.updatedAt > fulfillment.updatedAt
            ? dispatch.updatedAt
            : fulfillment.updatedAt,
        order: {
          status: fulfillment.order.status,
          total: fulfillment.order.total.toString(),
          currency: fulfillment.order.currency,
          deliveryAddress:
            fulfillment.order.deliveryAddress ?? undefined,
          deliveryLatitude:
            fulfillment.order.deliveryLatitude === null
              ? undefined
              : Number(fulfillment.order.deliveryLatitude),
          deliveryLongitude:
            fulfillment.order.deliveryLongitude === null
              ? undefined
              : Number(fulfillment.order.deliveryLongitude),
          deliveryInstructions:
            fulfillment.order.deliveryInstructions ?? undefined,
        },
        store,
      });
    }

    return {
      items,
      total,
      limit,
      offset,
      scope,
    };
  }
}

export const deliveryAgentDeliveryService =
  new DeliveryAgentDeliveryService();
