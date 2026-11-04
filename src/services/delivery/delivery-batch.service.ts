import { prisma } from "@/database/client/prisma";
import { dispatchAdapter } from "@/dispatch-engine/dispatch.adapter";
import { mobilityRoutingService } from "@/services/mobility/pricing/mobility-routing.service";

type Pickup = {
  fulfillmentId: string;
  orderId: string;
  storeId: string;
  customerId: string;
  organizationId: string;
  address: string;
  latitude: number;
  longitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  total: string;
  currency: string;
};

const DESTINATION_PRECISION = 4;
const MAX_ROUTE_DETOUR_RATIO = 1.8;

export class DeliveryBatchService {
  /**
   * Coalesces eligible, not-yet-assigned store fulfillments into a single
   * customer delivery journey. Called while delivery agents refresh offers.
   * A batch is created only when an OSRM route provider is configured; we
   * never substitute straight-line distance for road distance.
   */
  async preparePendingBatches(organizationId: string): Promise<number> {
    const fulfillments = await prisma.fulfillmentRequest.findMany({
      where: {
        organizationId,
        status: "REQUESTED",
        assignedAgentId: null,
        pickupType: "STORE",
        destinationType: "CUSTOMER",
        batchLeg: null,
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            total: true,
            currency: true,
            deliveryAddress: true,
            deliveryLatitude: true,
            deliveryLongitude: true,
            items: { select: { storeId: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const grouped = new Map<string, Pickup[]>();
    for (const fulfillment of fulfillments) {
      const order = fulfillment.order;
      const itemStoreId = order.items[0]?.storeId;
      if (
        !itemStoreId ||
        !order.deliveryAddress ||
        order.deliveryLatitude === null ||
        order.deliveryLongitude === null ||
        (order.status !== "CONFIRMED" && order.status !== "PROCESSING")
      ) continue;

      const store = await prisma.store.findUnique({
        where: { id: itemStoreId },
        select: { id: true, latitude: true, longitude: true },
      });
      if (!store || store.latitude === null || store.longitude === null) continue;

      const destinationLatitude = Number(order.deliveryLatitude);
      const destinationLongitude = Number(order.deliveryLongitude);
      const hash = [
        destinationLatitude.toFixed(DESTINATION_PRECISION),
        destinationLongitude.toFixed(DESTINATION_PRECISION),
      ].join(":");
      const key = [fulfillment.organizationId, order.userId, hash].join("|");
      const pickup: Pickup = {
        fulfillmentId: fulfillment.id,
        orderId: order.id,
        storeId: store.id,
        customerId: order.userId,
        organizationId: fulfillment.organizationId,
        address: order.deliveryAddress,
        latitude: Number(store.latitude),
        longitude: Number(store.longitude),
        destinationLatitude,
        destinationLongitude,
        total: order.total.toString(),
        currency: order.currency,
      };
      grouped.set(key, [...(grouped.get(key) ?? []), pickup]);
    }

    let createdCount = 0;
    for (const legs of grouped.values()) {
      const distinctStores = new Set(legs.map((leg) => leg.storeId));
      if (legs.length < 2 || distinctStores.size < 2) continue;

      const existing = await prisma.deliveryBatchLeg.findFirst({
        where: { fulfillmentId: { in: legs.map((leg) => leg.fulfillmentId) } },
        select: { id: true },
      });
      if (existing) continue;

      const ordered = await this.orderStops(legs);
      if (!ordered) continue;

      const destination = {
        latitude: ordered[0].destinationLatitude,
        longitude: ordered[0].destinationLongitude,
      };
      const destinationHash = [
        destination.latitude.toFixed(DESTINATION_PRECISION),
        destination.longitude.toFixed(DESTINATION_PRECISION),
      ].join(":");

      let batchId: string | undefined;
      try {
        const batch = await prisma.$transaction(async (tx) => {
          const created = await tx.deliveryBatch.create({
            data: {
              organizationId: ordered[0].organizationId,
              customerId: ordered[0].customerId,
              destinationHash,
              destinationAddress: ordered[0].address,
              destinationLatitude: destination.latitude,
              destinationLongitude: destination.longitude,
              pickupCount: ordered.length,
              routeDistanceMeters: ordered.reduce((sum, leg) => sum + leg.routeToNextMeters, 0),
              metadata: {
                routeProvider: "OSRM",
                routeProfile: "driving",
                orderIds: ordered.map((leg) => leg.orderId),
              },
            },
          });
          batchId = created.id;
          await tx.deliveryBatchLeg.createMany({
            data: ordered.map((leg, index) => ({
              id: crypto.randomUUID(),
              batchId: created.id,
              fulfillmentId: leg.fulfillmentId,
              pickupSequence: index + 1,
              pickupStoreId: leg.storeId,
              pickupLatitude: leg.latitude,
              pickupLongitude: leg.longitude,
            })),
          });
          return created;
        });

        const first = ordered[0];
        const dispatch = await dispatchAdapter.createRequest({
          organizationId: first.organizationId,
          serviceType: "DELIVERY",
          subject: { type: "DELIVERY_BATCH", id: batch.id },
          origin: { latitude: first.latitude, longitude: first.longitude },
          destination,
          candidatePolicyRef: "DELIVERY_BATCH_STANDARD",
          metadata: {
            batchId: batch.id,
            pickupCount: ordered.length,
            pickupStops: ordered.map((leg, index) => ({
              sequence: index + 1,
              fulfillmentId: leg.fulfillmentId,
              storeId: leg.storeId,
              latitude: leg.latitude,
              longitude: leg.longitude,
            })),
            orderIds: ordered.map((leg) => leg.orderId),
            destinationAddress: first.address,
            routeDistanceMeters: batch.routeDistanceMeters,
            routeProvider: "OSRM",
          },
        });

        await prisma.$transaction(async (tx) => {
          await tx.deliveryBatch.update({
            where: { id: batch.id },
            data: { dispatchRequestId: dispatch.id, status: "OFFERED" },
          });
          await tx.dispatchRequest.updateMany({
            where: {
              serviceType: "DELIVERY",
              subjectType: "FULFILLMENT",
              subjectId: { in: ordered.map((leg) => leg.fulfillmentId) },
              status: { in: ["CREATED", "SEARCHING", "OFFERED", "ASSIGNED"] },
            },
            data: { status: "CANCELLED" },
          });
        });
        await dispatchAdapter.discoverCandidates(dispatch);
        createdCount += 1;
      } catch (error) {
        if (batchId) {
          await prisma.deliveryBatch.delete({ where: { id: batchId } }).catch(() => undefined);
        }
        console.error("[DELIVERY_BATCH_PREPARE_FAILED]", {
          batchId,
          fulfillmentIds: legs.map((leg) => leg.fulfillmentId),
          error,
        });
      }
    }
    return createdCount;
  }

  async listOffers(input: { agentId: string; organizationId: string }) {
    const candidates = await prisma.dispatchCandidate.findMany({
      where: {
        agentId: input.agentId,
        available: true,
        dispatchRequest: {
          organizationId: input.organizationId,
          serviceType: "DELIVERY",
          subjectType: "DELIVERY_BATCH",
          status: { in: ["OFFERED", "ASSIGNED", "SEARCHING"] },
        },
      },
      include: {
        dispatchRequest: {
          include: {
            deliveryBatch: {
              include: {
                legs: {
                  orderBy: { pickupSequence: "asc" },
                  include: {
                    fulfillment: {
                      include: {
                        order: {
                          select: {
                            id: true,
                            total: true,
                            currency: true,
                            deliveryAddress: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return candidates.flatMap((candidate) => {
      const dispatch = candidate.dispatchRequest;
      const batch = dispatch.deliveryBatch;
      if (!batch || batch.status !== "OFFERED") return [];
      return [{
        dispatchId: dispatch.id,
        batchId: batch.id,
        pickupCount: batch.pickupCount,
        pickupStops: batch.legs.map((leg) => ({
          sequence: leg.pickupSequence,
          fulfillmentId: leg.fulfillmentId,
          orderId: leg.fulfillment.order.id,
          storeId: leg.pickupStoreId,
          latitude: Number(leg.pickupLatitude),
          longitude: Number(leg.pickupLongitude),
          status: leg.status,
        })),
        destination: {
          address: batch.destinationAddress,
          latitude: Number(batch.destinationLatitude),
          longitude: Number(batch.destinationLongitude),
        },
        routeDistanceMeters: batch.routeDistanceMeters,
        distanceToFirstPickupMeters: candidate.distanceMeters,
        score: candidate.score,
        createdAt: candidate.createdAt,
        orderTotals: batch.legs.map((leg) => ({
          orderId: leg.fulfillment.order.id,
          total: leg.fulfillment.order.total.toString(),
          currency: leg.fulfillment.order.currency,
        })),
      }];
    });
  }

  private async orderStops(legs: Pickup[]) {
    const remaining = [...legs];
    const ordered: Array<Pickup & { routeToNextMeters: number }> = [];
    let current = remaining.shift();
    if (!current) return null;

    let baselineMeters = 0;
    for (const leg of legs) {
      const direct = await mobilityRoutingService.estimate(
        { latitude: leg.latitude, longitude: leg.longitude },
        { latitude: leg.destinationLatitude, longitude: leg.destinationLongitude },
      );
      baselineMeters += direct.distanceMeters;
    }

    while (current) {
      const next = remaining.length
        ? remaining.sort((a, b) =>
            this.haversine(current!, a) - this.haversine(current!, b),
          )[0]
        : undefined;
      const target = next ?? {
        latitude: current.destinationLatitude,
        longitude: current.destinationLongitude,
      };
      const route = await mobilityRoutingService.estimate(
        { latitude: current.latitude, longitude: current.longitude },
        { latitude: target.latitude, longitude: target.longitude },
      );
      ordered.push({ ...current, routeToNextMeters: Math.round(route.distanceMeters) });
      if (!next) break;
      remaining.splice(remaining.findIndex((leg) => leg.fulfillmentId === next.fulfillmentId), 1);
      current = next;
    }

    const totalMeters = ordered.reduce((sum, leg) => sum + leg.routeToNextMeters, 0);
    if (totalMeters > baselineMeters * MAX_ROUTE_DETOUR_RATIO) return null;
    return ordered;
  }

  private haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(b.latitude - a.latitude);
    const dLon = radians(b.longitude - a.longitude);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
}

export const deliveryBatchService = new DeliveryBatchService();
