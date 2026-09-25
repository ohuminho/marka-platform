import type {
  DispatchCandidate,
  DispatchPort,
  DispatchRequest,
  DispatchStatus,
} from "@/dispatch-engine/dispatch.contracts";
import type {
  EntityRef,
  GeoPoint,
} from "@/core/domain/contracts";
import { prisma } from "@/database/client/prisma";

export interface CreateDispatchRequestInput {
  organizationId: string;
  serviceType: DispatchRequest["serviceType"];
  subject: EntityRef;
  origin: GeoPoint;
  destination?: GeoPoint;
  candidatePolicyRef?: string;
  metadata?: Record<string, unknown>;
}

export class DispatchAdapter implements DispatchPort {
  async createRequest(
    input: CreateDispatchRequestInput,
  ): Promise<DispatchRequest> {
    this.validateCreateRequest(input);

    const request = await prisma.dispatchRequest.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        serviceType: input.serviceType,
        subjectType: input.subject.type,
        subjectId: input.subject.id,
        originLatitude: input.origin.latitude,
        originLongitude: input.origin.longitude,
        destinationLatitude:
          input.destination?.latitude,
        destinationLongitude:
          input.destination?.longitude,
        status: "CREATED",
        candidatePolicyRef:
          input.candidatePolicyRef,
        metadata: input.metadata,
      },
    });

    await this.recordEvent(
      "dispatch.created",
      request.id,
      {
        serviceType: request.serviceType,
        subjectId: request.subjectId,
      },
    );

    return this.toContract(request);
  }

  async discoverCandidates(
    request: DispatchRequest,
  ): Promise<DispatchCandidate[]> {
    const stored =
      await prisma.dispatchRequest.findUnique({
        where: {
          id: request.id,
        },
        include: {
          candidates: true,
        },
      });

    if (!stored) {
      throw new Error(
        "Dispatch request not found.",
      );
    }

    if (
      stored.status === "CREATED" ||
      stored.status === "REASSIGNING"
    ) {
      await prisma.dispatchRequest.update({
        where: {
          id: stored.id,
        },
        data: {
          status: "SEARCHING",
        },
      });
    }

    return stored.candidates.map(
      (candidate) => ({
        agentId: candidate.agentId,
        score:
          candidate.score ?? undefined,
        distanceMeters:
          candidate.distanceMeters ?? undefined,
        available: candidate.available,
        metadata:
          this.jsonRecord(candidate.metadata),
      }),
    );
  }

  async assign(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest> {
    if (!agentId.trim()) {
      throw new Error("Agent is required.");
    }

    const request =
      await this.requireRequest(requestId);

    if (
      request.status !== "CREATED" &&
      request.status !== "SEARCHING" &&
      request.status !== "OFFERED" &&
      request.status !== "REASSIGNING"
    ) {
      throw new Error(
        "Dispatch request cannot be assigned in its current state.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "ASSIGNED",
          assignedAgentId: agentId,
        },
      });

    await this.recordEvent(
      "dispatch.assigned",
      requestId,
      {
        agentId,
      },
    );

    return this.toContract(updated);
  }

  async accept(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest> {
    if (!agentId.trim()) {
      throw new Error("Agent is required.");
    }

    const request =
      await this.requireRequest(requestId);

    if (
      request.status !== "ASSIGNED" &&
      request.status !== "OFFERED"
    ) {
      throw new Error(
        "Dispatch request cannot be accepted in its current state.",
      );
    }

    if (
      request.assignedAgentId &&
      request.assignedAgentId !== agentId
    ) {
      throw new Error(
        "Dispatch request is assigned to another agent.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "ACCEPTED",
          acceptedAgentId: agentId,
        },
      });

    await this.recordEvent(
      "dispatch.accepted",
      requestId,
      {
        agentId,
      },
    );

    return this.toContract(updated);
  }

  async reassign(
    requestId: string,
    reason: string,
  ): Promise<DispatchRequest> {
    if (!reason.trim()) {
      throw new Error(
        "Reassignment reason is required.",
      );
    }

    const request =
      await this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED" ||
      request.status === "EXPIRED"
    ) {
      throw new Error(
        "Dispatch request cannot be reassigned in its current state.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "REASSIGNING",
          assignedAgentId: null,
          acceptedAgentId: null,
          metadata: {
            reassignmentReason: reason,
          },
        },
      });

    await this.recordEvent(
      "dispatch.reassigned",
      requestId,
      {
        reason,
      },
    );

    return this.toContract(updated);
  }

  async complete(
    requestId: string,
  ): Promise<DispatchRequest> {
    const request =
      await this.requireRequest(requestId);

    if (request.status !== "ACCEPTED") {
      throw new Error(
        "Dispatch request cannot be completed in its current state.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "COMPLETED",
        },
      });

    await this.recordEvent(
      "dispatch.completed",
      requestId,
      {},
    );

    return this.toContract(updated);
  }

  async cancel(
    requestId: string,
    reason?: string,
  ): Promise<DispatchRequest> {
    const request =
      await this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED"
    ) {
      throw new Error(
        "Dispatch request cannot be cancelled in its current state.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "CANCELLED",
          metadata: reason
            ? {
                cancellationReason: reason,
              }
            : undefined,
        },
      });

    await this.recordEvent(
      "dispatch.cancelled",
      requestId,
      {
        reason: reason ?? null,
      },
    );

    return this.toContract(updated);
  }

  async expire(
    requestId: string,
  ): Promise<DispatchRequest> {
    const request =
      await this.requireRequest(requestId);

    if (
      request.status === "COMPLETED" ||
      request.status === "CANCELLED"
    ) {
      throw new Error(
        "Dispatch request cannot expire in its current state.",
      );
    }

    const updated =
      await prisma.dispatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "EXPIRED",
        },
      });

    return this.toContract(updated);
  }

  async setCandidates(
    requestId: string,
    candidates: DispatchCandidate[],
  ): Promise<DispatchRequest> {
    await this.requireRequest(requestId);

    const request =
      await prisma.$transaction(
        async (database) => {
          await database.dispatchCandidate.deleteMany({
            where: {
              dispatchRequestId: requestId,
            },
          });

          if (candidates.length > 0) {
            await database.dispatchCandidate.createMany({
              data: candidates.map(
                (candidate) => ({
                  id: crypto.randomUUID(),
                  dispatchRequestId:
                    requestId,
                  agentId:
                    candidate.agentId,
                  score:
                    candidate.score,
                  distanceMeters:
                    candidate.distanceMeters,
                  available:
                    candidate.available,
                  metadata:
                    candidate.metadata,
                }),
              ),
            });
          }

          return database.dispatchRequest.update({
            where: {
              id: requestId,
            },
            data: {
              status: "OFFERED",
            },
          });
        },
      );

    await this.recordEvent(
      "dispatch.candidates.discovered",
      requestId,
      {
        candidateCount:
          candidates.length,
      },
    );

    return this.toContract(request);
  }

  async getRequest(
    requestId: string,
  ): Promise<DispatchRequest | null> {
    const request =
      await prisma.dispatchRequest.findUnique({
        where: {
          id: requestId,
        },
      });

    return request
      ? this.toContract(request)
      : null;
  }

  private async requireRequest(
    requestId: string,
  ) {
    if (!requestId.trim()) {
      throw new Error(
        "Dispatch request is required.",
      );
    }

    const request =
      await prisma.dispatchRequest.findUnique({
        where: {
          id: requestId,
        },
      });

    if (!request) {
      throw new Error(
        "Dispatch request not found.",
      );
    }

    return request;
  }

  private validateCreateRequest(
    input: CreateDispatchRequestInput,
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error(
        "Organization is required.",
      );
    }

    if (!input.subject.id.trim()) {
      throw new Error(
        "Dispatch subject is required.",
      );
    }

    if (!input.subject.type.trim()) {
      throw new Error(
        "Dispatch subject type is required.",
      );
    }

    if (
      !Number.isFinite(
        input.origin.latitude,
      ) ||
      !Number.isFinite(
        input.origin.longitude,
      )
    ) {
      throw new Error(
        "Dispatch origin is invalid.",
      );
    }
  }

  private toContract(
    request: {
      id: string;
      organizationId: string;
      serviceType: string;
      subjectType: string;
      subjectId: string;
      originLatitude: unknown;
      originLongitude: unknown;
      destinationLatitude: unknown;
      destinationLongitude: unknown;
      status: string;
      candidatePolicyRef: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): DispatchRequest {
    const destination =
      request.destinationLatitude !== null &&
      request.destinationLongitude !== null
        ? {
            latitude: Number(
              request.destinationLatitude,
            ),
            longitude: Number(
              request.destinationLongitude,
            ),
          }
        : undefined;

    return {
      id: request.id,
      organizationId:
        request.organizationId,
      status:
        request.status as DispatchStatus,
      createdAt:
        request.createdAt,
      updatedAt:
        request.updatedAt,
      serviceType:
        request.serviceType as DispatchRequest["serviceType"],
      subject: {
        id: request.subjectId,
        type: request.subjectType,
      },
      origin: {
        latitude: Number(
          request.originLatitude,
        ),
        longitude: Number(
          request.originLongitude,
        ),
      },
      destination,
      candidatePolicyRef:
        request.candidatePolicyRef ??
        undefined,
    };
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

    return value as Record<
      string,
      unknown
    >;
  }

  private async recordEvent(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await prisma.domainEvent.create({
      data: {
        eventKey:
          `${eventType}:${aggregateId}:${crypto.randomUUID()}`,
        aggregateType: "DISPATCH",
        aggregateId,
        eventType,
        payload,
        status: "PENDING",
      },
    });
  }
}

export const dispatchAdapter =
  new DispatchAdapter();
