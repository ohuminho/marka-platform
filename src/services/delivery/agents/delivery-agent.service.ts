import { prisma } from "@/database/client/prisma";

export interface RegisterDeliveryAgentInput {
  organizationId: string;
  userId: string;
  transportMode: "WALK" | "BICYCLE" | "MOTORCYCLE" | "CAR" | "VAN";
  displayName?: string;
  phone?: string;
}

export interface UpdateDeliveryAgentLocationInput {
  agentId: string;
  latitude: number;
  longitude: number;
}

export class DeliveryAgentService {
  async register(input: RegisterDeliveryAgentInput) {
    this.validateCoordinates(undefined, undefined);

    if (!input.organizationId.trim()) {
      throw new Error("DELIVERY_AGENT_ORGANIZATION_REQUIRED");
    }

    if (!input.userId.trim()) {
      throw new Error("DELIVERY_AGENT_USER_REQUIRED");
    }

    const existing = await prisma.deliveryAgent.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });

    if (existing) {
      throw new Error("DELIVERY_AGENT_ALREADY_REGISTERED");
    }

    const membership = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!membership) {
      throw new Error("DELIVERY_AGENT_USER_NOT_IN_ORGANIZATION");
    }

    return prisma.deliveryAgent.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        userId: input.userId,
        transportMode: input.transportMode,
        displayName: input.displayName?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
      },
    });
  }

  async getByUser(userId: string, organizationId: string) {
    return prisma.deliveryAgent.findFirst({
      where: {
        userId,
        organizationId,
      },
    });
  }

  async updateLocation(input: UpdateDeliveryAgentLocationInput) {
    this.validateCoordinates(input.latitude, input.longitude);

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: input.agentId },
      select: { id: true, status: true },
    });

    if (!agent) {
      throw new Error("DELIVERY_AGENT_NOT_FOUND");
    }

    if (agent.status !== "ACTIVE") {
      throw new Error("DELIVERY_AGENT_NOT_ACTIVE");
    }

    return prisma.deliveryAgent.update({
      where: { id: input.agentId },
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        lastLocationAt: new Date(),
      },
    });
  }

  async setAvailability(
    agentId: string,
    availability:
      | "OFFLINE"
      | "AVAILABLE"
      | "BUSY"
      | "SUSPENDED",
  ) {
    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: agentId },
      select: { id: true, status: true },
    });

    if (!agent) {
      throw new Error("DELIVERY_AGENT_NOT_FOUND");
    }

    if (agent.status !== "ACTIVE" && availability !== "OFFLINE") {
      throw new Error("DELIVERY_AGENT_NOT_ACTIVE");
    }

    return prisma.deliveryAgent.update({
      where: { id: agentId },
      data: { availability },
    });
  }

  async activate(agentId: string) {
    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!agent) {
      throw new Error("DELIVERY_AGENT_NOT_FOUND");
    }

    return prisma.deliveryAgent.update({
      where: { id: agentId },
      data: {
        status: "ACTIVE",
        availability: "OFFLINE",
      },
    });
  }

  private validateCoordinates(
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    if (latitude === undefined && longitude === undefined) {
      return;
    }

    if (
      latitude === undefined ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error("INVALID_DELIVERY_AGENT_LATITUDE");
    }

    if (
      longitude === undefined ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("INVALID_DELIVERY_AGENT_LONGITUDE");
    }
  }
}

export const deliveryAgentService = new DeliveryAgentService();
