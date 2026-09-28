import { prisma } from "@/database/client/prisma";

export interface DeliveryAgentManagementListInput {
  organizationId: string;
  limit?: number;
  offset?: number;
}

export class DeliveryAgentManagementService {
  async list(
    input: DeliveryAgentManagementListInput,
  ) {
    if (!input.organizationId.trim()) {
      throw new Error(
        "DELIVERY_AGENT_ORGANIZATION_REQUIRED",
      );
    }

    const limit = Math.min(
      Math.max(input.limit ?? 50, 1),
      100,
    );

    const offset = Math.max(
      input.offset ?? 0,
      0,
    );

    const where = {
      organizationId: input.organizationId,
    };

    const [agents, total] = await Promise.all([
      prisma.deliveryAgent.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          userId: true,
          status: true,
          availability: true,
          transportMode: true,
          displayName: true,
          phone: true,
          latitude: true,
          longitude: true,
          lastLocationAt: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.deliveryAgent.count({
        where,
      }),
    ]);

    return {
      items: agents,
      total,
      limit,
      offset,
    };
  }
}

export const deliveryAgentManagementService =
  new DeliveryAgentManagementService();
