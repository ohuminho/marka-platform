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
}

export class FulfillmentAdapter implements FulfillmentPort {
  private readonly requests = new Map<string, FulfillmentRequest>();
  private readonly assignments = new Map<string, FulfillmentAssignment>();

  async request(
    input: FulfillmentRequestInput,
    correlationId?: string,
  ): Promise<FulfillmentRequest> {
    const now = new Date();

    const request: FulfillmentRequest = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now,
      orderId: input.orderId,
      pickup: input.pickup,
      destination: input.destination,
      assignedAgentId: input.assignedAgentId,
      exceptionCode: input.exceptionCode,
    };

    this.requests.set(request.id, request);

    void correlationId;

    return request;
  }

  async assign(
    fulfillmentId: string,
    agentId: string,
  ): Promise<FulfillmentAssignment> {
    const request = this.getRequired(fulfillmentId);

    if (request.status !== "REQUESTED" && request.status !== "EXCEPTION") {
      throw new Error(
        "Fulfillment can only be assigned from REQUESTED or EXCEPTION.",
      );
    }

    if (!agentId.trim()) {
      throw new Error("Fulfillment agent is required.");
    }

    const now = new Date();

    const assignment: FulfillmentAssignment = {
      fulfillmentId,
      agentId,
      assignedAt: now,
    };

    this.assignments.set(fulfillmentId, assignment);

    this.updateStatus(request, "ASSIGNED");
    request.assignedAgentId = agentId;

    return assignment;
  }

  async transition(
    fulfillmentId: string,
    status: FulfillmentStatus,
    reason?: string,
  ): Promise<FulfillmentRequest> {
    const request = this.getRequired(fulfillmentId);

    if (!this.isValidTransition(request.status, status)) {
      throw new Error(
        `Invalid fulfillment transition: ${request.status} -> ${status}.`,
      );
    }

    if (status === "EXCEPTION") {
      request.exceptionCode = reason?.trim() || "FULFILLMENT_EXCEPTION";
    }

    this.updateStatus(request, status);

    return request;
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

    if (!command.orderId.trim()) {
      throw new Error("Order is required.");
    }

    if (!command.pickup.id.trim()) {
      throw new Error("Pickup location is required.");
    }

    if (!command.destination.id.trim()) {
      throw new Error("Destination is required.");
    }

    return this.request({
      orderId: command.orderId,
      pickup: command.pickup,
      destination: command.destination,
      organizationId: command.organizationId,
      assignedAgentId: undefined,
      exceptionCode: undefined,
    });
  }

  get(fulfillmentId: string): FulfillmentRequest | null {
    return this.requests.get(fulfillmentId) ?? null;
  }

  private getRequired(fulfillmentId: string): FulfillmentRequest {
    const request = this.get(fulfillmentId);

    if (!request) {
      throw new Error("Fulfillment not found.");
    }

    return request;
  }

  private updateStatus(
    request: FulfillmentRequest,
    status: FulfillmentStatus,
  ): void {
    request.status = status;
    request.updatedAt = new Date();
  }

  private isValidTransition(
    current: FulfillmentStatus,
    next: FulfillmentStatus,
  ): boolean {
    if (current === next) return true;

    const transitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
      REQUESTED: ["ASSIGNED", "CANCELLED", "EXCEPTION"],
      ASSIGNED: ["PREPARING", "CANCELLED", "EXCEPTION"],
      PREPARING: ["READY_FOR_PICKUP", "CANCELLED", "EXCEPTION"],
      READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED", "EXCEPTION"],
      PICKED_UP: ["IN_TRANSIT", "EXCEPTION"],
      IN_TRANSIT: ["COMPLETED", "EXCEPTION"],
      COMPLETED: [],
      EXCEPTION: ["ASSIGNED", "CANCELLED"],
      CANCELLED: [],
    };

    return transitions[current].includes(next);
  }
}

export const fulfillmentAdapter = new FulfillmentAdapter();
