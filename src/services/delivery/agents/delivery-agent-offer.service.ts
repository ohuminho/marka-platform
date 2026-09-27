import { prisma } from "@/database/client/prisma";

export interface DeliveryAgentOfferListInput {
  agentId: string;
  organizationId: string;
  limit?: number;
  offset?: number;
}

export interface DeliveryAgentOfferItem {
  dispatchId: string;
  fulfillmentId: string;
  orderId: string;
  distanceMeters?: number;
  score?: number;
  createdAt: Date;
  store?: { id: string; name: string };
  pickup: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number; address?: string };
  order: { total: string; currency: string };
}

export class DeliveryAgentOfferService {
  async list(input: DeliveryAgentOfferListInput) {
    if (!input.agentId.trim()) throw new Error("DELIVERY_AGENT_REQUIRED");
    if (!input.organizationId.trim()) throw new Error("DELIVERY_AGENT_ORGANIZATION_REQUIRED");

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const offset = Math.max(input.offset ?? 0, 0);

    const eligibleDispatches = await prisma.dispatchRequest.findMany({
      where: {
        organizationId: input.organizationId,
        serviceType: "DELIVERY",
        status: { in: ["OFFERED", "ASSIGNED"] },
        subjectType: "FULFILLMENT",
      },
      select: {
        id: true,
        subjectId: true,
        originLatitude: true,
        originLongitude: true,
        destinationLatitude: true,
        destinationLongitude: true,
      },
    });

    const eligibleDispatchIds = eligibleDispatches.map((dispatch) => dispatch.id);
    if (eligibleDispatchIds.length === 0) {
      return { items: [], total: 0, limit, offset };
    }

    const candidateWhere = {
      agentId: input.agentId,
      available: true,
      dispatchRequestId: { in: eligibleDispatchIds },
    };

    const [candidates, total] = await Promise.all([
      prisma.dispatchCandidate.findMany({
        where: candidateWhere,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          dispatchRequestId: true,
          distanceMeters: true,
          score: true,
          createdAt: true,
        },
      }),
      prisma.dispatchCandidate.count({ where: candidateWhere }),
    ]);

    const dispatchRequestIds = candidates.map(
      (candidate) => candidate.dispatchRequestId,
    );

    const dispatchRequests = eligibleDispatches.filter((dispatch) =>
      dispatchRequestIds.includes(dispatch.id),
    );

    const dispatchById = new Map(
      dispatchRequests.map((dispatch) => [dispatch.id, dispatch]),
    );

    const fulfillmentIds = dispatchRequests.map((dispatch) => dispatch.subjectId);
    const fulfillments = await prisma.fulfillmentRequest.findMany({
      where: {
        id: { in: fulfillmentIds },
        organizationId: input.organizationId,
      },
      select: { id: true, orderId: true },
    });

    const orderIds = fulfillments.map((item) => item.orderId);
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        total: true,
        currency: true,
        deliveryAddress: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        items: { select: { storeId: true }, take: 1 },
      },
    });

    const stores = await prisma.store.findMany({
      where: {
        id: {
          in: Array.from(
            new Set(
              orders.flatMap((order) =>
                order.items
                  .map((item) => item.storeId)
                  .filter((id): id is string => Boolean(id)),
              ),
            ),
          ),
        },
      },
      select: { id: true, name: true },
    });

    const fulfillmentById = new Map(fulfillments.map((item) => [item.id, item]));
    const orderById = new Map(orders.map((item) => [item.id, item]));
    const storeById = new Map(stores.map((item) => [item.id, item]));

    const items: DeliveryAgentOfferItem[] = [];

    for (const candidate of candidates) {
      const dispatch = dispatchById.get(candidate.dispatchRequestId);
      if (!dispatch) continue;

      const fulfillment = fulfillmentById.get(dispatch.subjectId);
      const order = fulfillment ? orderById.get(fulfillment.orderId) : undefined;
      if (!fulfillment || !order) continue;

      const storeId = order.items[0]?.storeId;

      items.push({
        dispatchId: dispatch.id,
        fulfillmentId: fulfillment.id,
        orderId: fulfillment.orderId,
        distanceMeters: candidate.distanceMeters ?? undefined,
        score: candidate.score ?? undefined,
        createdAt: candidate.createdAt,
        store: storeId ? storeById.get(storeId) : undefined,
        pickup: {
          latitude: Number(dispatch.originLatitude),
          longitude: Number(dispatch.originLongitude),
        },
        destination:
          dispatch.destinationLatitude !== null &&
          dispatch.destinationLongitude !== null
            ? {
                latitude: Number(dispatch.destinationLatitude),
                longitude: Number(dispatch.destinationLongitude),
                address: order.deliveryAddress ?? undefined,
              }
            : undefined,
        order: {
          total: order.total.toString(),
          currency: order.currency,
        },
      });
    }

    return { items, total, limit, offset };
  }
}

export const deliveryAgentOfferService = new DeliveryAgentOfferService();
