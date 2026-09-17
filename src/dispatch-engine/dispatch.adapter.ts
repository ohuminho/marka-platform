import type {
  DispatchCandidate,
  DispatchPort,
  DispatchRequest,
  DispatchStatus,
} from "@/dispatch-engine/dispatch.contracts";
import type { EntityRef, GeoPoint } from "@/core/domain/contracts";

export interface CreateDispatchRequestInput {
  organizationId: string;
  serviceType: DispatchRequest["serviceType"];
  subject: EntityRef;
  origin: GeoPoint;
  destination?: GeoPoint;
  candidatePolicyRef?: string;
}

export class DispatchAdapter implements DispatchPort {
  private readonly requests = new Map<string, DispatchRequest>();
  private readonly candidates = new Map<string, DispatchCandidate[]>();

  createRequest(input: CreateDispatchRequestInput): DispatchRequest {
    if (!input.organizationId.trim()) {
      throw new Error("Organization is required.");
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const request: DispatchRequest = {
      id,
      organizationId: input.organizationId,
      status: "CREATED",
      createdAt: now,
      updatedAt: now,
      serviceType: input.serviceType,
      subject: input.subject,
      origin: input.origin,
      destination: input.destination,
      candidatePolicyRef: input.candidatePolicyRef,
    };

    this.requests.set(id, request);
    this.candidates.set(id, []);

    return request;
  }

  async discoverCandidates(
    request: DispatchRequest,
  ): Promise<DispatchCandidate[]> {
    const stored = this.requests.get(request.id);

    if (!stored) {
      throw new Error("Dispatch request not found.");
    }

    const existingCandidates = this.candidates.get(request.id) ?? [];

    if (stored.status === "CREATED") {
      this.updateStatus(request.id, "SEARCHING");
    }

    return existingCandidates;
  }

  async assign(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest> {
    if (!agentId.trim()) {
      throw new Error("Agent is required.");
    }

    const request = this.requireRequest(requestId);

    if (
      request.status !== "CREATED" &&
      request.status !== "SEARCHING" &&
      request.status !== "OFFERED" &&
      request.status !== "REASSIGNING"
    ) {
      throw new Error("Dispatch request cannot be assigned in its current state.");
    }

    return this.updateStatus(requestId, "ASSIGNED");
  }

  async accept(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest> {
    if (!agentId.trim()) {
      throw new Error("Agent is required.");
    }

    const request = this.requireRequest(requestId);

    if (request.status !== "ASSIGNED" && request.status !== "OFFERED") {
      throw new Error("Dispatch request cannot be accepted in its current state.");
    }

    return this.updateStatus(requestId, "ACCEPTED");
  }

  async reassign(
    requestId: string,
    reason: string,
  ): Promise<DispatchRequest> {
    if (!reason.trim()) {
      throw new Error("Reassignment reason is required.");
    }

    const request = this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED" ||
      request.status === "EXPIRED"
    ) {
      throw new Error("Dispatch request cannot be reassigned in its current state.");
    }

    return this.updateStatus(requestId, "REASSIGNING");
  }

  complete(requestId: string): DispatchRequest {
    const request = this.requireRequest(requestId);

    if (request.status !== "ACCEPTED") {
      throw new Error("Dispatch request cannot be completed in its current state.");
    }

    return this.updateStatus(requestId, "COMPLETED");
  }

  cancel(requestId: string, reason?: string): DispatchRequest {
    const request = this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED"
    ) {
      throw new Error("Dispatch request cannot be cancelled in its current state.");
    }

    const updated = this.updateStatus(requestId, "CANCELLED");

    if (reason?.trim()) {
      return {
        ...updated,
        candidatePolicyRef: updated.candidatePolicyRef,
      };
    }

    return updated;
  }

  expire(requestId: string): DispatchRequest {
    const request = this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED"
    ) {
      throw new Error("Dispatch request cannot expire in its current state.");
    }

    return this.updateStatus(requestId, "EXPIRED");
  }

  setCandidates(
    requestId: string,
    candidates: DispatchCandidate[],
  ): DispatchRequest {
    this.requireRequest(requestId);

    this.candidates.set(requestId, [...candidates]);

    return this.updateStatus(requestId, "OFFERED");
  }

  getRequest(requestId: string): DispatchRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  private requireRequest(requestId: string): DispatchRequest {
    if (!requestId.trim()) {
      throw new Error("Dispatch request is required.");
    }

    const request = this.requests.get(requestId);

    if (!request) {
      throw new Error("Dispatch request not found.");
    }

    return request;
  }

  private updateStatus(
    requestId: string,
    status: DispatchStatus,
  ): DispatchRequest {
    const request = this.requireRequest(requestId);

    const updated: DispatchRequest = {
      ...request,
      status,
      updatedAt: new Date(),
    };

    this.requests.set(requestId, updated);

    return updated;
  }
}

export const dispatchAdapter = new DispatchAdapter();
