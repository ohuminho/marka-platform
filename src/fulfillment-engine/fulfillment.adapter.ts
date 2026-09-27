import { OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type {
  EntityRef,
  PolicyContext,
} from "@/core/domain/contracts";
import type {
  FulfillmentAssignment,
  FulfillmentPort,
  FulfillmentRequest,
  FulfillmentStatus,
} from "@/fulfillment-engine/fulfillment.contracts";
import { prisma } from "@/database/client/prisma";
import { dispatchAdapter } from "@/dispatch-engine/dispatch.adapter";

export interface CreateFulfillmentCommand {
  organizationId: string;
  orderId: string;
  pickup: EntityRef;
  destination: EntityRef;
  metadata?: Record<string, unknown>;
}

export interface FulfillmentRequestInput {
  organizationId: string;
  orderId: string;
  pickup: EntityRef;
  destination: EntityRef;
  assignedAgentId?: string;
  exceptionCode?: string;
  metadata?: Record<string, unknown>;
}

export class FulfillmentAdapter implements FulfillmentPort {
  async request(
    input: FulfillmentRequestInput,
    correlationId?: string,
  ): Promise<FulfillmentRequest> {
    this.validateRequestInput(input);

    const existing = await prisma.fulfillmentRequest.findUnique({
      where: {
        orderId: input.orderId,
      },
    });

    if (existing) {
      const ensured = await this.ensureDeliveryDispatch(existing);
      return this.toContract(ensured);
    }

    const request = await prisma.$transaction(
      async (database) => {
        const created = await database.fulfillmentRequest.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: input.organizationId,
            orderId: input.orderId,
            pickupType: input.pickup.type,
            pickupId: input.pickup.id,
            destinationType: input.destination.type,
            destinationId: input.destination.id,
            status: "REQUESTED",
            assignedAgentId: input.assignedAgentId,
            exceptionCode: input.exceptionCode,
            metadata: {
              ...(input.metadata ?? {}),
              correlationId: correlationId ?? null,
            },
          },
        });

        await database.order.updateMany({
          where: {
            id: input.orderId,
            status: "CONFIRMED",
          },
          data: {
            status: "PROCESSING",
          },
        });

        return created;
      },
    );

    const fulfilled = await this.ensureDeliveryDispatch(request);

    await this.recordEvent(
      "fulfillment.requested",
      request.id,
      request.organizationId,
      {
        orderId: request.orderId,
        status: request.status,
        correlationId: correlationId ?? null,
      },
    );

    return this.toContract(fulfilled);
  }

  private async ensureDeliveryDispatch(request: {
    id: string;
    organizationId: string;
    orderId: string;
    pickupType: string;
    pickupId: string;
    destinationType: string;
    destinationId: string;
    metadata: Prisma.JsonValue | null;
    status: string;
    assignedAgentId: string | null;
    exceptionCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (
      request.pickupType !== "STORE" ||
      request.destinationType !== "CUSTOMER"
    ) {
      return request;
    }

    const metadata = this.jsonRecord(request.metadata);
    const delivery = this.jsonRecord(metadata.delivery);
    const latitude = Number(delivery.latitude);
    const longitude = Number(delivery.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return request;
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      await this.recordEvent(
        "fulfillment.dispatch.invalid_destination",
        request.id,
        request.organizationId,
        {
          orderId: request.orderId,
          latitude,
          longitude,
        },
      );
      return request;
    }

    const store = await prisma.store.findUnique({
      where: {
        id: request.pickupId,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    if (
      !store ||
      store.latitude === null ||
      store.longitude === null
    ) {
      return request;
    }

    const existingDispatch =
      await prisma.dispatchRequest.findUnique({
        where: {
          subjectType_subjectId: {
            subjectType: "FULFILLMENT",
            subjectId: request.id,
          },
        },
      });

    if (existingDispatch) {
      return request;
    }

    try {
      const dispatch =
        await dispatchAdapter.createRequest({
          organizationId: request.organizationId,
          serviceType: "DELIVERY",
          subject: {
            type: "FULFILLMENT",
            id: request.id,
          },
          origin: {
            latitude: Number(store.latitude),
            longitude: Number(store.longitude),
          },
          destination: {
            latitude,
            longitude,
          },
          candidatePolicyRef: "DELIVERY_STANDARD",
          metadata: {
            source: "FULFILLMENT_REQUESTED",
            orderId: request.orderId,
            fulfillmentId: request.id,
            deliveryAddress:
              typeof delivery.address === "string"
                ? delivery.address
                : null,
            deliveryInstructions:
              typeof delivery.instructions === "string"
                ? delivery.instructions
                : null,
          },
        });

      return prisma.fulfillmentRequest.update({
        where: {
          id: request.id,
        },
        data: {
          metadata: {
            ...metadata,
            dispatchRequestId: dispatch.id,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const racedDispatch =
        await prisma.dispatchRequest.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: "FULFILLMENT",
              subjectId: request.id,
            },
          },
        });

      if (racedDispatch) {
        return request;
      }

      console.error(
        "[FULFILLMENT_DISPATCH_CREATE_ERROR]",
        {
          fulfillmentId: request.id,
          orderId: request.orderId,
          error,
        },
      );

      await this.recordEvent(
        "fulfillment.dispatch.create_failed",
        request.id,
        request.organizationId,
        {
          orderId: request.orderId,
          error:
            error instanceof Error
              ? error.message
              : "Unknown dispatch creation error.",
        },
      );

      return request;
    }
  }

  async assign(
    fulfillmentId: string,
    agentId: string,
  ): Promise<FulfillmentAssignment> {
    if (!fulfillmentId.trim()) {
      throw new Error("Fulfillment is required.");
    }

    if (!agentId.trim()) {
      throw new Error("Fulfillment agent is required.");
    }

    const request = await prisma.fulfillmentRequest.findUnique({
      where: {
        id: fulfillmentId,
      },
    });

    if (!request) {
      throw new Error("Fulfillment not found.");
    }

    if (
      request.status !== "REQUESTED" &&
      request.status !== "EXCEPTION"
    ) {
      throw new Error(
        "Fulfillment can only be assigned from REQUESTED or EXCEPTION.",
      );
    }

    const now = new Date();

    const assignment = await prisma.$transaction(async (database) => {
      const created = await database.fulfillmentAssignment.upsert({
        where: {
          fulfillmentId,
        },
        create: {
          id: crypto.randomUUID(),
          fulfillmentId,
          agentId,
          assignedAt: now,
        },
        update: {
          agentId,
          assignedAt: now,
          acceptedAt: null,
        },
      });

      await database.fulfillmentRequest.update({
        where: {
          id: fulfillmentId,
        },
        data: {
          status: "ASSIGNED",
          assignedAgentId: agentId,
          exceptionCode: null,
        },
      });

      return created;
    });

    await this.recordEvent(
      "fulfillment.assigned",
      fulfillmentId,
      request.organizationId,
      {
        agentId,
      },
    );

    return {
      fulfillmentId: assignment.fulfillmentId,
      agentId: assignment.agentId,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt ?? undefined,
    };
  }

  async transition(
    fulfillmentId: string,
    status: FulfillmentStatus,
    reason?: string,
  ): Promise<FulfillmentRequest> {
    if (!fulfillmentId.trim()) {
      throw new Error("Fulfillment is required.");
    }

    const current = await prisma.fulfillmentRequest.findUnique({
      where: {
        id: fulfillmentId,
      },
    });

    if (!current) {
      throw new Error("Fulfillment not found.");
    }

    const currentStatus = current.status as FulfillmentStatus;

    if (currentStatus === status) {
      return this.toContract(current);
    }

    if (!this.isValidTransition(currentStatus, status)) {
      throw new Error(
        `Invalid fulfillment transition: ${currentStatus} -> ${status}.`,
      );
    }

    const updated = await prisma.$transaction(async (database) => {
      const result = await database.fulfillmentRequest.update({
        where: {
          id: fulfillmentId,
        },
        data: {
          status,
          exceptionCode:
            status === "EXCEPTION"
              ? reason?.trim() || "FULFILLMENT_EXCEPTION"
              : null,
        },
      });

      const orderStatusByFulfillmentStatus: Partial<
        Record<FulfillmentStatus, OrderStatus>
      > = {
        PREPARING: "PROCESSING",
        READY_FOR_PICKUP: "PROCESSING",
        PICKED_UP: "SHIPPED",
        IN_TRANSIT: "SHIPPED",
        COMPLETED: "DELIVERED",
        CANCELLED: "CANCELLED",
      };

      const nextOrderStatus =
        orderStatusByFulfillmentStatus[status];

      if (nextOrderStatus) {
        const allowedCurrentStatuses: OrderStatus[] =
          nextOrderStatus === OrderStatus.CANCELLED
            ? [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED]
            : nextOrderStatus === OrderStatus.SHIPPED
              ? [OrderStatus.CONFIRMED, OrderStatus.PROCESSING]
              : nextOrderStatus === OrderStatus.DELIVERED
                ? [OrderStatus.SHIPPED, OrderStatus.PROCESSING]
                : [OrderStatus.CONFIRMED, OrderStatus.PROCESSING];

        await database.order.updateMany({
          where: {
            id: result.orderId,
            status: {
              in: allowedCurrentStatuses,
            },
          },
          data: {
            status: nextOrderStatus,
          },
        });
      }

      if (status === "COMPLETED" || status === "CANCELLED") {
        await database.fulfillmentAssignment.updateMany({
          where: {
            fulfillmentId,
            acceptedAt: null,
          },
          data: {
            acceptedAt:
              status === "COMPLETED"
                ? new Date()
                : null,
          },
        });
      }

      return result;
    });

    await this.recordEvent(
      this.eventTypeForStatus(status),
      fulfillmentId,
      updated.organizationId,
      {
        fromStatus: currentStatus,
        toStatus: status,
        reason: reason ?? null,
      },
    );

    return this.toContract(updated);
  }

  async create(
    command: CreateFulfillmentCommand,
    context: PolicyContext,
  ): Promise<FulfillmentRequest> {
    if (command.organizationId !== context.organizationId) {
      throw new Error(
        "Fulfillment organization does not match the policy context.",
      );
    }

    return this.request({
      organizationId: command.organizationId,
      orderId: command.orderId,
      pickup: command.pickup,
      destination: command.destination,
      metadata: command.metadata,
    });
  }

  async retryDeliveryDispatch(
    fulfillmentId: string,
  ): Promise<FulfillmentRequest> {
    if (!fulfillmentId.trim()) {
      throw new Error("Fulfillment is required.");
    }

    const request = await prisma.fulfillmentRequest.findUnique({
      where: {
        id: fulfillmentId,
      },
    });

    if (!request) {
      throw new Error("Fulfillment not found.");
    }

    const fulfilled = await this.ensureDeliveryDispatch(request);

    await this.recordEvent(
      "fulfillment.dispatch.retry_requested",
      request.id,
      request.organizationId,
      {
        orderId: request.orderId,
      },
    );

    return this.toContract(fulfilled);
  }

  async get(
    fulfillmentId: string,
  ): Promise<FulfillmentRequest | null> {
    const request = await prisma.fulfillmentRequest.findUnique({
      where: {
        id: fulfillmentId,
      },
    });

    return request ? this.toContract(request) : null;
  }

  private validateRequestInput(
    input: FulfillmentRequestInput,
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error("Organization is required.");
    }

    if (!input.orderId.trim()) {
      throw new Error("Order is required.");
    }

    if (!input.pickup.id.trim()) {
      throw new Error("Pickup location is required.");
    }

    if (!input.pickup.type.trim()) {
      throw new Error("Pickup type is required.");
    }

    if (!input.destination.id.trim()) {
      throw new Error("Destination is required.");
    }

    if (!input.destination.type.trim()) {
      throw new Error("Destination type is required.");
    }
  }

  private jsonRecord(
    value: unknown,
  ): Record<string, unknown> {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private toContract(
    request: {
      id: string;
      organizationId: string;
      orderId: string;
      pickupType: string;
      pickupId: string;
      destinationType: string;
      destinationId: string;
      status: string;
      assignedAgentId: string | null;
      exceptionCode: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): FulfillmentRequest {
    return {
      id: request.id,
      organizationId: request.organizationId,
      status: request.status as FulfillmentStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      orderId: request.orderId,
      pickup: {
        id: request.pickupId,
        type: request.pickupType,
      },
      destination: {
        id: request.destinationId,
        type: request.destinationType,
      },
      assignedAgentId:
        request.assignedAgentId ?? undefined,
      exceptionCode:
        request.exceptionCode ?? undefined,
    };
  }

  private isValidTransition(
    current: FulfillmentStatus,
    next: FulfillmentStatus,
  ): boolean {
    const transitions: Record<
      FulfillmentStatus,
      FulfillmentStatus[]
    > = {
      REQUESTED: [
        "ASSIGNED",
        "CANCELLED",
        "EXCEPTION",
      ],
      ASSIGNED: [
        "PREPARING",
        "CANCELLED",
        "EXCEPTION",
      ],
      PREPARING: [
        "READY_FOR_PICKUP",
        "CANCELLED",
        "EXCEPTION",
      ],
      READY_FOR_PICKUP: [
        "PICKED_UP",
        "CANCELLED",
        "EXCEPTION",
      ],
      PICKED_UP: [
        "IN_TRANSIT",
        "EXCEPTION",
      ],
      IN_TRANSIT: [
        "COMPLETED",
        "EXCEPTION",
      ],
      COMPLETED: [],
      EXCEPTION: [
        "ASSIGNED",
        "CANCELLED",
      ],
      CANCELLED: [],
    };

    return transitions[current].includes(next);
  }

  private eventTypeForStatus(
    status: FulfillmentStatus,
  ): string {
    switch (status) {
      case "ASSIGNED":
        return "fulfillment.assigned";
      case "PREPARING":
        return "fulfillment.preparation.started";
      case "PICKED_UP":
        return "fulfillment.picked_up";
      case "COMPLETED":
        return "fulfillment.completed";
      case "EXCEPTION":
        return "fulfillment.exceptioned";
      case "CANCELLED":
        return "fulfillment.cancelled";
      default:
        return `fulfillment.${status.toLowerCase()}`;
    }
  }

  private async recordEvent(
    eventType: string,
    aggregateId: string,
    organizationId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await prisma.domainEvent.create({
      data: {
        eventKey: `${eventType}:${aggregateId}:${crypto.randomUUID()}`,
        aggregateType: "FULFILLMENT",
        aggregateId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });

    void organizationId;
  }
}

export const fulfillmentAdapter =
  new FulfillmentAdapter();
