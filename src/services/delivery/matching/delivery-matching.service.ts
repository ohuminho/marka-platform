import { prisma } from "@/database/client/prisma";

export interface DeliveryMatchRequest {
  organizationId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  radiusMeters?: number;
  limit?: number;
  transportModes?: Array<
    "WALK" | "BICYCLE" | "MOTORCYCLE" | "CAR" | "VAN"
  >;
}

export interface DeliveryMatchCandidate {
  agentId: string;
  distanceMeters: number;
  score: number;
  metadata: Record<string, unknown>;
}

export class DeliveryMatchingService {
  async findCandidates(
    input: DeliveryMatchRequest,
  ): Promise<DeliveryMatchCandidate[]> {
    this.validate(input);

    const radiusMeters = input.radiusMeters ?? 10_000;
    const limit = Math.min(input.limit ?? 10, 50);

    const agents = await prisma.deliveryAgent.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
        availability: "AVAILABLE",
        latitude: { not: null },
        longitude: { not: null },
        lastLocationAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000),
        },
        ...(input.transportModes && input.transportModes.length > 0
          ? { transportMode: { in: input.transportModes } }
          : {}),
      },
      select: {
        id: true,
        transportMode: true,
        latitude: true,
        longitude: true,
        lastLocationAt: true,
      },
    });

    const candidates: DeliveryMatchCandidate[] = [];

    for (const agent of agents) {
      if (agent.latitude === null || agent.longitude === null) {
        continue;
      }

      const distanceMeters = this.calculateDistanceMeters(
        input.pickupLatitude,
        input.pickupLongitude,
        Number(agent.latitude),
        Number(agent.longitude),
      );

      if (distanceMeters > radiusMeters) {
        continue;
      }

      const freshnessSeconds = Math.max(
        0,
        (Date.now() - (agent.lastLocationAt?.getTime() ?? 0)) / 1000,
      );

      const score =
        Math.max(0, 1_000_000 - distanceMeters) -
        Math.min(100_000, freshnessSeconds * 100);

      candidates.push({
        agentId: agent.id,
        distanceMeters,
        score,
        metadata: {
          transportMode: agent.transportMode,
          locationRecordedAt:
            agent.lastLocationAt?.toISOString() ?? null,
        },
      });
    }

    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceMeters - b.distanceMeters,
    );

    return candidates.slice(0, limit);
  }

  private calculateDistanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ): number {
    const earthRadiusMeters = 6_371_000;
    const latA = this.toRadians(latitudeA);
    const latB = this.toRadians(latitudeB);
    const deltaLat = this.toRadians(latitudeB - latitudeA);
    const deltaLongitude = this.toRadians(longitudeB - longitudeA);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(latA) *
        Math.cos(latB) *
        Math.sin(deltaLongitude / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return earthRadiusMeters * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private validate(input: DeliveryMatchRequest): void {
    if (!input.organizationId.trim()) {
      throw new Error("DELIVERY_MATCH_ORGANIZATION_REQUIRED");
    }

    if (
      !Number.isFinite(input.pickupLatitude) ||
      input.pickupLatitude < -90 ||
      input.pickupLatitude > 90
    ) {
      throw new Error("INVALID_DELIVERY_PICKUP_LATITUDE");
    }

    if (
      !Number.isFinite(input.pickupLongitude) ||
      input.pickupLongitude < -180 ||
      input.pickupLongitude > 180
    ) {
      throw new Error("INVALID_DELIVERY_PICKUP_LONGITUDE");
    }

    if (
      input.radiusMeters !== undefined &&
      (!Number.isFinite(input.radiusMeters) ||
        input.radiusMeters <= 0)
    ) {
      throw new Error("DELIVERY_MATCH_RADIUS_INVALID");
    }

    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) ||
        input.limit <= 0)
    ) {
      throw new Error("DELIVERY_MATCH_LIMIT_INVALID");
    }
  }
}

export const deliveryMatchingService =
  new DeliveryMatchingService();
