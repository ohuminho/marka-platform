import { prisma } from "@/database/client/prisma";

export class CustomerDeliveryTrackingService {
  async getForOrder(orderId: string, userId: string) {
    if (!orderId.trim()) throw new Error("ORDER_ID_REQUIRED");
    if (!userId.trim()) throw new Error("USER_ID_REQUIRED");

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        fulfillment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!order.fulfillment) return null;

    const dispatch = await prisma.dispatchRequest.findUnique({
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
        acceptedAgentId: true,
      },
    });

    if (!dispatch || dispatch.serviceType !== "DELIVERY") return null;

    const agent = dispatch.acceptedAgentId
      ? await prisma.deliveryAgent.findUnique({
          where: { id: dispatch.acceptedAgentId },
          select: {
            displayName: true,
            transportMode: true,
            latitude: true,
            longitude: true,
            lastLocationAt: true,
          },
        })
      : null;

    const locationFreshnessThresholdMs = 5 * 60 * 1000;
    const locationTimestamp = agent?.lastLocationAt?.getTime() ?? 0;
    const locationFresh =
      locationTimestamp > 0 &&
      Date.now() - locationTimestamp <= locationFreshnessThresholdMs;

    return {
      dispatchId: dispatch.id,
      status: dispatch.status,
      fulfillmentStatus: order.fulfillment.status,
      agent: agent
        ? {
            displayName: agent.displayName,
            transportMode: agent.transportMode,
            latitude: agent.latitude === null ? null : Number(agent.latitude),
            longitude: agent.longitude === null ? null : Number(agent.longitude),
            lastLocationAt: agent.lastLocationAt,
            locationFresh,
          }
        : null,
    };
  }
}

export const customerDeliveryTrackingService =
  new CustomerDeliveryTrackingService();
