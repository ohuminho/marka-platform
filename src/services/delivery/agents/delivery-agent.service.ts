import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { assertDeliveryAgentAvailabilityChange } from "@/services/delivery/agents/delivery-agent-availability.policy";
import { getDeliveryLocationCutoff } from "@/services/delivery/agents/delivery-agent-location.policy";

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
    if (!input.organizationId.trim()) throw new Error("DELIVERY_AGENT_ORGANIZATION_REQUIRED");
    if (!input.userId.trim()) throw new Error("DELIVERY_AGENT_USER_REQUIRED");

    const existing = await prisma.deliveryAgent.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (existing) throw new Error("DELIVERY_AGENT_ALREADY_REGISTERED");

    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId: input.organizationId, userId: input.userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!membership) throw new Error("DELIVERY_AGENT_USER_NOT_IN_ORGANIZATION");

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
    return prisma.deliveryAgent.findFirst({ where: { userId, organizationId } });
  }

  async updateLocation(input: UpdateDeliveryAgentLocationInput) {
    this.validateCoordinates(input.latitude, input.longitude);
    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: input.agentId },
      select: { id: true, status: true },
    });
    if (!agent) throw new Error("DELIVERY_AGENT_NOT_FOUND");
    if (agent.status !== "ACTIVE") throw new Error("DELIVERY_AGENT_NOT_ACTIVE");

    const now = new Date();
    const updated = await prisma.deliveryAgent.updateMany({
      where: {
        id: input.agentId,
        status: "ACTIVE",
        OR: [
          { lastLocationAt: null },
          { lastLocationAt: { lte: getDeliveryLocationCutoff(now) } },
        ],
      },
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        lastLocationAt: now,
      },
    });

    if (updated.count !== 1) {
      const current = await prisma.deliveryAgent.findUnique({
        where: { id: input.agentId },
        select: { id: true, status: true },
      });
      if (!current) throw new Error("DELIVERY_AGENT_NOT_FOUND");
      if (current.status !== "ACTIVE") throw new Error("DELIVERY_AGENT_NOT_ACTIVE");
      throw new Error("DELIVERY_AGENT_LOCATION_THROTTLED");
    }

    return prisma.deliveryAgent.findUniqueOrThrow({
      where: { id: input.agentId },
    });
  }

  async setAvailability(
    agentId: string,
    availability: "OFFLINE" | "AVAILABLE" | "BUSY" | "SUSPENDED",
  ) {
    return prisma.$transaction(async (database) => {
      const agent = await database.deliveryAgent.findUnique({
        where: { id: agentId },
        select: { id: true, organizationId: true, status: true, availability: true },
      });
      if (!agent) throw new Error("DELIVERY_AGENT_NOT_FOUND");
      if (agent.status !== "ACTIVE" && availability !== "OFFLINE") {
        throw new Error("DELIVERY_AGENT_NOT_ACTIVE");
      }

      // This conditional no-op update serializes this transition with dispatch acceptance.
      const locked = await database.deliveryAgent.updateMany({
        where: { id: agentId, organizationId: agent.organizationId, availability: agent.availability },
        data: { availability: agent.availability },
      });
      if (locked.count !== 1) throw new Error("DELIVERY_AGENT_AVAILABILITY_CHANGED_RETRY");

      const activeDeliveries = await database.dispatchRequest.count({
        where: {
          organizationId: agent.organizationId,
          serviceType: "DELIVERY",
          status: "ACCEPTED",
          acceptedAgentId: agentId,
        },
      });
      assertDeliveryAgentAvailabilityChange(activeDeliveries, availability);

      return database.deliveryAgent.update({ where: { id: agentId }, data: { availability } });
    });
  }

  async updateStatus(
    agentId: string,
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "INACTIVE",
  ) {
    return prisma.$transaction(async (database) => {
      const agent = await database.deliveryAgent.findUnique({
        where: { id: agentId },
        select: { id: true, userId: true, status: true, organizationId: true, availability: true },
      });
      if (!agent) throw new Error("DELIVERY_AGENT_NOT_FOUND");

      const locked = await database.deliveryAgent.updateMany({
        where: { id: agentId, organizationId: agent.organizationId, availability: agent.availability },
        data: { availability: agent.availability },
      });
      if (locked.count !== 1) throw new Error("DELIVERY_AGENT_AVAILABILITY_CHANGED_RETRY");

      const activeDeliveries = await database.dispatchRequest.count({
        where: {
          organizationId: agent.organizationId,
          serviceType: "DELIVERY",
          status: "ACCEPTED",
          acceptedAgentId: agentId,
        },
      });
      if (activeDeliveries > 0 && status !== "ACTIVE") {
        throw new Error("DELIVERY_AGENT_HAS_ACTIVE_DELIVERY");
      }

      const updated = await database.deliveryAgent.update({
        where: { id: agentId },
        data: { status, availability: activeDeliveries > 0 ? "BUSY" : "OFFLINE" },
      });

      await this.syncDeliveryAgentRole(database, {
        userId: agent.userId,
        organizationId: agent.organizationId,
      }, status);

      return updated;
    });
  }

  async activate(agentId: string) {
    return this.updateStatus(agentId, "ACTIVE");
  }

  private async syncDeliveryAgentRole(
    database: Prisma.TransactionClient,
    agent: { userId: string; organizationId: string },
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "INACTIVE",
  ) {
    const role = await database.role.upsert({
      where: {
        organizationId_name: {
          organizationId: agent.organizationId,
          name: "DELIVERY_AGENT",
        },
      },
      update: { status: "ACTIVE" },
      create: {
        organizationId: agent.organizationId,
        name: "DELIVERY_AGENT",
        description: "MARKA marketplace delivery partner",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (status === "ACTIVE") {
      const permission = await database.permission.findUnique({
        where: { action: "DELIVERY_AGENT_OPERATE" },
        select: { id: true },
      });
      if (!permission) throw new Error("DELIVERY_AGENT_PERMISSION_NOT_CONFIGURED");

      await database.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      await database.userRole.upsert({
        where: {
          userId_roleId_organizationId: {
            userId: agent.userId,
            roleId: role.id,
            organizationId: agent.organizationId,
          },
        },
        update: {},
        create: {
          userId: agent.userId,
          roleId: role.id,
          organizationId: agent.organizationId,
        },
      });
      return;
    }

    await database.userRole.deleteMany({
      where: {
        userId: agent.userId,
        roleId: role.id,
        organizationId: agent.organizationId,
      },
    });
  }

  private validateCoordinates(latitude: number | undefined, longitude: number | undefined): void {
    if (latitude === undefined && longitude === undefined) return;
    if (latitude === undefined || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("INVALID_DELIVERY_AGENT_LATITUDE");
    }
    if (longitude === undefined || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("INVALID_DELIVERY_AGENT_LONGITUDE");
    }
  }
}

export const deliveryAgentService = new DeliveryAgentService();
