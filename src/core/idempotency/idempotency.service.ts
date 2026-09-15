import { createHash } from "node:crypto";

import { prisma } from "@/database/client/prisma";

export interface IdempotencyExecutionInput {
  key: string;
  scope: string;
  userId?: string;
  requestBody?: unknown;
  expiresAt?: Date;
}

export interface IdempotencyExecutionResult<T> {
  replayed: boolean;
  responseStatus?: number;
  responseBody?: T;
  resourceType?: string;
  resourceId?: string;
}

export class IdempotencyService {
  async execute<T>(
    input: IdempotencyExecutionInput,
    operation: () => Promise<{
      responseStatus: number;
      responseBody: T;
      resourceType?: string;
      resourceId?: string;
    }>
  ): Promise<IdempotencyExecutionResult<T>> {
    this.validateInput(input);

    const requestHash = this.hashRequest(input.requestBody);

    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        key: input.key.trim(),
      },
    });

    if (existing) {
      if (existing.expiresAt <= new Date()) {
        await prisma.idempotencyRecord.delete({
          where: { id: existing.id },
        });
      } else {
        if (
          existing.scope !== input.scope ||
          existing.requestHash !== requestHash
        ) {
          throw new Error(
            "Idempotency key was already used with a different request."
          );
        }

        if (existing.status === "COMPLETED") {
          return {
            replayed: true,
            responseStatus: existing.responseStatus ?? undefined,
            responseBody: existing.responseBody as T | undefined,
            resourceType: existing.resourceType ?? undefined,
            resourceId: existing.resourceId ?? undefined,
          };
        }

        throw new Error(
          "An operation with this idempotency key is already in progress."
        );
      }
    }

    const record = await prisma.idempotencyRecord.create({
      data: {
        key: input.key.trim(),
        scope: input.scope,
        userId: input.userId,
        requestHash,
        status: "IN_PROGRESS",
        expiresAt:
          input.expiresAt ??
          new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    try {
      const result = await operation();

      await prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: {
          status: "COMPLETED",
          responseStatus: result.responseStatus,
          responseBody:
            result.responseBody as Parameters<
              typeof prisma.idempotencyRecord.update
            >[0]["data"]["responseBody"],
          resourceType: result.resourceType,
          resourceId: result.resourceId,
        },
      });

      return {
        replayed: false,
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        resourceType: result.resourceType,
        resourceId: result.resourceId,
      };
    } catch (error) {
      await prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: {
          status: "FAILED",
        },
      });

      throw error;
    }
  }

  private validateInput(
    input: IdempotencyExecutionInput
  ): void {
    if (!input.key.trim()) {
      throw new Error("Idempotency key is required.");
    }

    if (!input.scope.trim()) {
      throw new Error("Idempotency scope is required.");
    }

    if (input.key.length > 255) {
      throw new Error(
        "Idempotency key cannot exceed 255 characters."
      );
    }

    if (input.scope.length > 255) {
      throw new Error(
        "Idempotency scope cannot exceed 255 characters."
      );
    }
  }

  private hashRequest(requestBody: unknown): string {
    const serialized = JSON.stringify(
      this.normalize(requestBody)
    );

    return createHash("sha256")
      .update(serialized)
      .digest("hex");
  }

  private normalize(value: unknown): unknown {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalize(item));
    }

    const object = value as Record<string, unknown>;

    return Object.keys(object)
      .sort()
      .reduce<Record<string, unknown>>(
        (result, key) => {
          result[key] = this.normalize(object[key]);
          return result;
        },
        {}
      );
  }
}
