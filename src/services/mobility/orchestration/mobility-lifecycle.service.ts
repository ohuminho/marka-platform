import { randomUUID } from "node:crypto";

import {
  MobilityRideStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import { financialAuditService } from "@/core/audit/financial-audit.service";

import { mobilityDispatchService } from "@/dispatch-engine/mobility-dispatch.service";

import { commissionPolicyService } from "@/services/finance/commission/commission-policy.service";

import { mobilityFinancialOrchestratorService } from "@/services/mobility/finance/mobility-financial-orchestrator.service";

import { mobilitySafetyService } from "@/services/mobility/safety/mobility-safety.service";

import { mobilityRideService } from "@/services/mobility/rides/mobility-ride.service";

import type {
  InitializeMobilityLifecycleInput,
  MobilityLifecycleActionInput,
  MobilityLifecycleCompleteInput,
  MobilityLifecycleExecuteInput,
  MobilityLifecycleInitializeFinancialsInput,
  MobilityLifecycleResult,
} from "./mobility-lifecycle.contracts";

import type {
  MobilityLifecycleAction,
  MobilityOrchestrationStatus,
  MobilityOrchestrationStep,
  MobilitySafetyMode,
} from "./mobility-lifecycle.types";

interface OrchestrationRow {
  id: string;

  organizationId: string;

  rideId: string;

  status: MobilityOrchestrationStatus;

  currentStep: MobilityOrchestrationStep;

  version: number;

  attemptCount: number;

  correlationId: string | null;

  requestId: string | null;

  lastErrorCode: string | null;

  lastError: string | null;

  nextRetryAt: Date | null;
}

const TRANSITIONS: Record<
  MobilityOrchestrationStep,
  readonly MobilityOrchestrationStep[]
> = {
  REQUESTED: [
    "SAFETY_READY",
    "SEARCHING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  SAFETY_READY: [
    "SEARCHING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  SEARCHING: [
    "DRIVER_ASSIGNED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ASSIGNED: [
    "DRIVER_ACCEPTED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ACCEPTED: [
    "DRIVER_ARRIVING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ARRIVING: [
    "DRIVER_ARRIVED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ARRIVED: [
    "TRIP_STARTED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_STARTED: [
    "TRIP_IN_PROGRESS",
    "TRIP_COMPLETED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_IN_PROGRESS: [
    "TRIP_COMPLETED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_COMPLETED: [
    "PAYMENT_INITIALIZED",
    "FINANCIAL_FINALIZED",
    "RECOVERY_REQUIRED",
    "FAILED",
  ],

  PAYMENT_INITIALIZED: [
    "FINANCIAL_FINALIZED",
    "RECOVERY_REQUIRED",
    "FAILED",
  ],

  FINANCIAL_FINALIZED: [],

  CANCELLED: [],

  FAILED: [
    "RECOVERY_REQUIRED",
  ],

  RECOVERY_REQUIRED: [
    "PAYMENT_INITIALIZED",
    "FINANCIAL_FINALIZED",
    "FAILED",
    "CANCELLED",
  ],
};

export class MobilityLifecycleService {
  async initialize(
    input: InitializeMobilityLifecycleInput
  ): Promise<MobilityLifecycleResult> {
    this.validateContext(
      input.idempotencyKey,
      input.organizationId,
      input.rideId
    );

    const ride =
      await prisma.mobilityRide.findFirst({
        where: {
          id: input.rideId,
          organizationId:
            input.organizationId,
        },

        select: {
          id: true,
          organizationId: true,
          status: true,
          metadata: true,
        },
      });

    if (!ride) {
      throw new Error(
        "Mobility ride was not found."
      );
    }

    const existing =
      await this.getByRide(
        input.organizationId,
        input.rideId
      );

    if (existing) {
      return this.result(
        existing,
        "REQUEST"
      );
    }

    const orchestrationId =
      randomUUID();

    const now =
      new Date();

    const safetyMode =
      input.safetyMode ??
      this.readSafetyMode(
        ride.metadata
      );

    await prisma.$executeRaw`
      INSERT INTO "MobilityRideOrchestration" (
        "id",
        "organizationId",
        "rideId",
        "status",
        "currentStep",
        "version",
        "attemptCount",
        "correlationId",
        "requestId",
        "startedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${orchestrationId},
        ${input.organizationId},
        ${input.rideId},
        'ACTIVE'::"MobilityOrchestrationStatus",
        'REQUESTED'::"MobilityOrchestrationStep",
        1,
        0,
        ${input.correlationId ?? null},
        ${input.requestId ?? null},
        ${now},
        ${now},
        ${now}
      )
    `;

    await this.recordEvent({
      orchestrationId,
      organizationId:
        input.organizationId,
      rideId:
        input.rideId,
      action:
        "REQUEST",
      fromStep:
        null,
      toStep:
        "REQUESTED",
      status:
        "ACTIVE",
      idempotencyKey:
        input.idempotencyKey,
      correlationId:
        input.correlationId,
      requestId:
        input.requestId,
      actorUserId:
        input.actorUserId,
      metadata: {
        ...(input.metadata ?? {}),
        safetyMode,
      },
    });

    await financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_ORCHESTRATION_INITIALIZED",

      entityType:
        "MOBILITY_RIDE_ORCHESTRATION",

      entityId:
        orchestrationId,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        rideId:
          input.rideId,

        safetyMode,
      },
    });

    const created =
      await this.requireById(
        orchestrationId
      );

    return this.result(
      created,
      "REQUEST"
    );
  }

  async execute(
    input: MobilityLifecycleExecuteInput
  ): Promise<MobilityLifecycleResult> {
    this.validateContext(
      input.idempotencyKey,
      input.organizationId,
      input.rideId
    );

    let orchestration =
      await this.getByRide(
        input.organizationId,
        input.rideId
      );

    if (!orchestration) {
      await this.initialize({
        organizationId:
          input.organizationId,

        rideId:
          input.rideId,

        actorUserId:
          input.actorUserId,

        correlationId:
          input.correlationId,

        requestId:
          input.requestId,

        idempotencyKey:
          `${input.idempotencyKey}:initialize`,

        ipAddress:
          input.ipAddress,

        userAgent:
          input.userAgent,

        safetyMode:
          input.safetyMode,
      });

      orchestration =
        await this.getByRide(
          input.organizationId,
          input.rideId
        );
    }

    if (!orchestration) {
      throw new Error(
        "Mobility ride orchestration could not be initialized."
      );
    }

    const existingEvent =
      await this.findEvent(
        input.idempotencyKey
      );

    if (existingEvent) {
      return this.result(
        orchestration,
        input.action
      );
    }

    try {
      return await this.executeAction(
        orchestration,
        input
      );
    } catch (error) {
      const classified =
        this.classifyFailure(
          error
        );

      const recovery =
        classified.retryable ||
        classified.classification ===
          "DEPENDENCY" ||
        classified.classification ===
          "TRANSIENT";

      const nextStatus:
        MobilityOrchestrationStatus =
        recovery
          ? "RECOVERY_REQUIRED"
          : "FAILED";

      const nextStep:
        MobilityOrchestrationStep =
        recovery
          ? "RECOVERY_REQUIRED"
          : "FAILED";

      await this.persistFailure(
        orchestration,
        input,
        nextStatus,
        nextStep,
        classified.code,
        classified.message,
        recovery
      );

      return {
        ...this.result(
          await this.requireById(
            orchestration.id
          ),
          input.action
        ),

        recoveryRequired:
          recovery,

        error: {
          code:
            classified.code,

          message:
            classified.message,

          retryable:
            recovery,
        },
      };
    }
  }

  async get(
    organizationId: string,
    rideId: string
  ): Promise<MobilityLifecycleResult | null> {
    const row =
      await this.getByRide(
        organizationId,
        rideId
      );

    return row
      ? this.result(
          row,
          "REQUEST"
        )
      : null;
  }

  private async executeAction(
    orchestration: OrchestrationRow,
    input: MobilityLifecycleExecuteInput
  ): Promise<MobilityLifecycleResult> {
    const safetyMode =
      input.safetyMode ??
      await this.getRideSafetyMode(
        input.organizationId,
        input.rideId
      );

    switch (input.action) {
      case "REQUEST":
        return this.result(
          orchestration,
          input.action
        );

      case "SAFETY_PRECHECK": {
        const ride =
          await this.requireRide(
            input.organizationId,
            input.rideId
          );

        await mobilitySafetyService.createTripSafety({
          organizationId:
            input.organizationId,

          rideId:
            input.rideId,

          riderId:
            ride.riderId,

          mode:
            safetyMode,

          trustedRide:
            safetyMode ===
            "TRUSTED",

          childRide:
            safetyMode ===
            "CHILD",

          actorUserId:
            input.actorUserId,

          correlationId:
            input.correlationId,
        });

        return this.advance(
          orchestration,
          input,
          "SAFETY_READY"
        );
      }

      case "SEARCH": {
        let current =
          orchestration;

        if (
          current.currentStep ===
          "REQUESTED"
        ) {
          const ride =
            await this.requireRide(
              input.organizationId,
              input.rideId
            );

          await mobilitySafetyService.createTripSafety({
            organizationId:
              input.organizationId,

            rideId:
              input.rideId,

            riderId:
              ride.riderId,

            mode:
              safetyMode,

            trustedRide:
              safetyMode ===
              "TRUSTED",

            childRide:
              safetyMode ===
              "CHILD",

            actorUserId:
              input.actorUserId,

            correlationId:
              input.correlationId,
          });

          current =
            await this.transitionPersisted(
              current,
              {
                ...input,
                idempotencyKey:
                  `${input.idempotencyKey}:safety`,
              },
              "SAFETY_READY"
            );
        }

        await mobilityRideService.startSearch(
          input.rideId
        );

        return this.advance(
          current,
          input,
          "SEARCHING"
        );
      }

      case "DISPATCH": {
        let current =
          orchestration;

        if (
          current.currentStep ===
          "REQUESTED"
        ) {
          const ride =
            await this.requireRide(
              input.organizationId,
              input.rideId
            );

          await mobilitySafetyService.createTripSafety({
            organizationId:
              input.organizationId,

            rideId:
              input.rideId,

            riderId:
              ride.riderId,

            mode:
              safetyMode,

            trustedRide:
              safetyMode ===
              "TRUSTED",

            childRide:
              safetyMode ===
              "CHILD",

            actorUserId:
              input.actorUserId,

            correlationId:
              input.correlationId,
          });

          current =
            await this.transitionPersisted(
              current,
              {
                ...input,
                idempotencyKey:
                  `${input.idempotencyKey}:safety`,
              },
              "SAFETY_READY"
            );
        }

        if (
          current.currentStep ===
          "SAFETY_READY"
        ) {
          await mobilityRideService.startSearch(
            input.rideId
          );

          current =
            await this.transitionPersisted(
              current,
              {
                ...input,
                idempotencyKey:
                  `${input.idempotencyKey}:search`,
              },
              "SEARCHING"
            );
        }

        const dispatch =
          await mobilityDispatchService.dispatch({
            rideId:
              input.rideId,

            safetyMode,
          });

        return this.advance(
          current,
          input,
          "DRIVER_ASSIGNED",
          dispatch.assignment
        );
      }

      case "ACCEPT": {
        const ride =
          await this.requireRide(
            input.organizationId,
            input.rideId
          );

        if (!ride.driverId) {
          throw new Error(
            "Ride has no assigned driver."
          );
        }

        const driver =
          await prisma.mobilityDriver.findUnique({
            where: {
              id:
                ride.driverId,
            },

            select: {
              id: true,
              userId: true,
            },
          });

        if (
          !driver ||
          driver.userId !==
            input.actorUserId
        ) {
          throw new Error(
            "Only the assigned driver may accept the ride."
          );
        }

        await mobilityDispatchService.acceptAssignment(
          input.rideId,
          ride.driverId,
          safetyMode
        );

        return this.advance(
          orchestration,
          input,
          "DRIVER_ACCEPTED"
        );
      }

      case "DRIVER_ARRIVING":
        await mobilityRideService.markDriverArriving(
          input.rideId
        );

        return this.advance(
          orchestration,
          input,
          "DRIVER_ARRIVING"
        );

      case "DRIVER_ARRIVED":
        await mobilityRideService.markDriverArrived(
          input.rideId
        );

        return this.advance(
          orchestration,
          input,
          "DRIVER_ARRIVED"
        );

      case "START_TRIP":
        await mobilityRideService.startTrip(
          input.rideId
        );

        return this.advance(
          orchestration,
          input,
          "TRIP_STARTED"
        );

      case "BEGIN_TRIP_PROGRESS":
        await mobilityRideService.beginTripProgress(
          input.rideId
        );

        return this.advance(
          orchestration,
          input,
          "TRIP_IN_PROGRESS"
        );

      case "INITIALIZE_FINANCIALS":
        return this.initializeFinancials(
          orchestration,
          input as MobilityLifecycleInitializeFinancialsInput
        );

      case "COMPLETE":
        return this.completeRide(
          orchestration,
          input as MobilityLifecycleCompleteInput
        );

      case "CANCEL": {
        const reason =
          input.reason?.trim();

        if (!reason) {
          throw new Error(
            "Ride cancellation reason is required."
          );
        }

        await mobilityRideService.cancel(
          input.rideId,
          reason
        );

        return this.advance(
          orchestration,
          input,
          "CANCELLED",
          undefined,
          "CANCELLED"
        );
      }

      case "RETRY_RECOVERY": {
        if (
          orchestration.status !==
          "RECOVERY_REQUIRED"
        ) {
          throw new Error(
            "Ride orchestration is not waiting for recovery."
          );
        }

        if (
          "finalFareMinor" in input
        ) {
          return this.completeRide(
            orchestration,
            {
              ...input,
              action:
                "COMPLETE",
            } as MobilityLifecycleCompleteInput
          );
        }

        throw new Error(
          "Recovery retry requires the complete financial input."
        );
      }
    }
  }

  private async initializeFinancials(
    orchestration: OrchestrationRow,
    input: MobilityLifecycleInitializeFinancialsInput
  ): Promise<MobilityLifecycleResult> {
    if (
      input.estimatedFareMinor <
      BigInt(0) ||
      (
        input.finalFareMinor !==
        undefined &&
        input.finalFareMinor <
          BigInt(0)
      )
    ) {
      throw new Error(
        "Mobility fare values cannot be negative."
      );
    }

    const ride =
      await this.requireRide(
        input.organizationId,
        input.rideId
      );

    const policy =
      this.getMobilityCommissionPolicy(
        ride.serviceType
      );

    const financials =
      await mobilityFinancialOrchestratorService
        .initializeRideFinancials({
          organizationId:
            input.organizationId,

          rideId:
            input.rideId,

          riderId:
            ride.riderId,

          driverId:
            ride.driverId ??
            undefined,

          paymentMethod:
            input.paymentMethod,

          currency:
            ride.currency,

          estimatedFareMinor:
            input.estimatedFareMinor,

          finalFareMinor:
            input.finalFareMinor,

          commissionRateBps:
            policy.rateBps,

          pricingSnapshot:
            input.pricingSnapshot,

          metadata: {
            ...(input.metadata ?? {}),

            orchestration:
              "MOBILITY_LIFECYCLE",

            commissionPolicyKey:
              policy.key,

            commissionPolicyVersion:
              policy.version,
          },

          idempotencyKey:
            input.idempotencyKey,

          actorUserId:
            input.actorUserId,

          correlationId:
            input.correlationId,

          requestId:
            input.requestId,

          ipAddress:
            input.ipAddress,

          userAgent:
            input.userAgent,
        });

    const updated =
      await this.transitionPersisted(
        orchestration,
        input,
        "PAYMENT_INITIALIZED",
        financials
      );

    return {
      ...this.result(
        updated,
        input.action
      ),

      financialState:
        financials.financialState,

      financials,

      ride,
    };
  }

  private async completeRide(
    orchestration: OrchestrationRow,
    input: MobilityLifecycleCompleteInput
  ): Promise<MobilityLifecycleResult> {
    if (
      input.finalFareMinor <
        BigInt(0) ||
      input.estimatedFareMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Mobility fare values cannot be negative."
      );
    }

    if (
      input.paymentMethod ===
        "DIGITAL" &&
      input.availableDigitalProceedsMinor ===
        undefined
    ) {
      throw new Error(
        "Available digital proceeds are required for DIGITAL settlement."
      );
    }

    const ride =
      await this.requireRide(
        input.organizationId,
        input.rideId
      );

    if (
      ride.status !==
      MobilityRideStatus.TRIP_COMPLETED
    ) {
      await mobilityRideService.complete(
        input.rideId
      );
    }

    const completedRide =
      await this.requireRide(
        input.organizationId,
        input.rideId
      );

    if (
      completedRide.status !==
      MobilityRideStatus.TRIP_COMPLETED
    ) {
      throw new Error(
        "Ride could not be moved to TRIP_COMPLETED."
      );
    }

    let current =
      await this.requireById(
        orchestration.id
      );

    if (
      current.currentStep !==
        "TRIP_COMPLETED" &&
      current.currentStep !==
        "PAYMENT_INITIALIZED" &&
      current.currentStep !==
        "RECOVERY_REQUIRED"
    ) {
      current =
        await this.transitionPersisted(
          current,
          input,
          "TRIP_COMPLETED"
        );
    }

    const policy =
      this.getMobilityCommissionPolicy(
        completedRide.serviceType
      );

    const financials =
      await mobilityFinancialOrchestratorService
        .initializeRideFinancials({
          organizationId:
            input.organizationId,

          rideId:
            input.rideId,

          riderId:
            completedRide.riderId,

          driverId:
            completedRide.driverId ??
            undefined,

          paymentMethod:
            input.paymentMethod,

          currency:
            completedRide.currency,

          estimatedFareMinor:
            input.estimatedFareMinor,

          finalFareMinor:
            input.finalFareMinor,

          commissionRateBps:
            policy.rateBps,

          pricingSnapshot:
            input.pricingSnapshot,

          metadata: {
            ...(input.metadata ?? {}),

            orchestration:
              "MOBILITY_LIFECYCLE",

            commissionPolicyKey:
              policy.key,

            commissionPolicyVersion:
              policy.version,
          },

          idempotencyKey:
            input.paymentIdempotencyKey,

          actorUserId:
            input.actorUserId,

          correlationId:
            input.correlationId,

          requestId:
            input.requestId,

          ipAddress:
            input.ipAddress,

          userAgent:
            input.userAgent,
        });

    current =
      await this.transitionPersisted(
        current,
        input,
        "PAYMENT_INITIALIZED",
        financials
      );

    const finalized =
      await mobilityFinancialOrchestratorService
        .finalizeRideFinancials({
          organizationId:
            input.organizationId,

          rideId:
            input.rideId,

          finalFareMinor:
            input.finalFareMinor,

          availableDigitalProceedsMinor:
            input.availableDigitalProceedsMinor,

          sourceReference:
            input.sourceReference,

          actorUserId:
            input.actorUserId,

          correlationId:
            input.correlationId,

          requestId:
            input.requestId,

          ipAddress:
            input.ipAddress,

          userAgent:
            input.userAgent,

          paymentIdempotencyKey:
            input.paymentIdempotencyKey,

          settlementIdempotencyKey:
            input.settlementIdempotencyKey,

          settlementCompletionIdempotencyKey:
            input.settlementCompletionIdempotencyKey,

          metadata: {
            ...(input.metadata ?? {}),

            orchestration:
              "MOBILITY_LIFECYCLE",
          },
        });

    current =
      await this.transitionPersisted(
        current,
        input,
        "FINANCIAL_FINALIZED",
        finalized,
        "COMPLETED"
      );

    await financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_RIDE_LIFECYCLE_COMPLETED",

      entityType:
        "MOBILITY_RIDE",

      entityId:
        input.rideId,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        orchestrationId:
          current.id,

        paymentMethod:
          input.paymentMethod,

        finalFareMinor:
          input.finalFareMinor.toString(),

        financialState:
          finalized.financialState,
      },
    });

    return {
      ...this.result(
        current,
        input.action
      ),

      financialState:
        finalized.financialState,

      financials:
        finalized,

      ride:
        completedRide,

      recoveryRequired:
        false,
    };
  }

  private async advance(
    orchestration: OrchestrationRow,
    input: MobilityLifecycleActionInput,
    step: MobilityOrchestrationStep,
    assignment?: unknown,
    status?: MobilityOrchestrationStatus
  ): Promise<MobilityLifecycleResult> {
    const updated =
      await this.transitionPersisted(
        orchestration,
        input,
        step,
        assignment,
        status
      );

    const ride =
      await mobilityRideService.getById(
        input.rideId
      );

    return {
      ...this.result(
        updated,
        input.action
      ),

      ride,

      assignment,

      recoveryRequired:
        updated.status ===
        "RECOVERY_REQUIRED",
    };
  }

  private async transitionPersisted(
    current: OrchestrationRow,
    input: MobilityLifecycleActionInput,
    nextStep: MobilityOrchestrationStep,
    metadata?: unknown,
    finalStatus?: MobilityOrchestrationStatus
  ): Promise<OrchestrationRow> {
    if (
      !TRANSITIONS[
        current.currentStep
      ].includes(nextStep)
    ) {
      if (
        current.currentStep ===
        nextStep
      ) {
        return current;
      }

      throw new Error(
        `Invalid mobility orchestration transition ${current.currentStep} -> ${nextStep}.`
      );
    }

    const nextStatus =
      finalStatus ??
      (
        nextStep ===
        "CANCELLED"
          ? "CANCELLED"
          : current.status ===
            "RECOVERY_REQUIRED"
            ? "ACTIVE"
            : current.status
      );

    const now =
      new Date();

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const rows =
            await tx.$queryRaw<
              OrchestrationRow[]
            >`
              UPDATE "MobilityRideOrchestration"
              SET
                "currentStep" =
                  ${nextStep}::"MobilityOrchestrationStep",

                "status" =
                  ${nextStatus}::"MobilityOrchestrationStatus",

                "version" =
                  "version" + 1,

                "attemptCount" =
                  "attemptCount" + 1,

                "lastErrorCode" =
                  NULL,

                "lastError" =
                  NULL,

                "nextRetryAt" =
                  NULL,

                "completedAt" =
                  CASE
                    WHEN
                      ${nextStatus} =
                      'COMPLETED'::"MobilityOrchestrationStatus"
                    THEN
                      ${now}
                    ELSE
                      "completedAt"
                  END,

                "updatedAt" =
                  ${now}

              WHERE
                "id" =
                  ${current.id}

                AND "version" =
                  ${current.version}

              RETURNING *
            `;

          if (
            rows.length !==
            1
          ) {
            throw new Error(
              "Mobility orchestration concurrency conflict."
            );
          }

          const updatedRow =
            rows[0];

          await tx.$executeRaw`
            INSERT INTO
              "MobilityRideOrchestrationEvent" (
                "id",
                "orchestrationId",
                "organizationId",
                "rideId",
                "action",
                "fromStep",
                "toStep",
                "status",
                "idempotencyKey",
                "correlationId",
                "requestId",
                "actorUserId",
                "metadata",
                "createdAt"
              )
            VALUES (
              ${randomUUID()},
              ${current.id},
              ${input.organizationId},
              ${input.rideId},
              ${input.action},
              ${current.currentStep},
              ${nextStep}::"MobilityOrchestrationStep",
              ${nextStatus}::"MobilityOrchestrationStatus",
              ${input.idempotencyKey},
              ${input.correlationId ?? null},
              ${input.requestId ?? null},
              ${input.actorUserId ?? null},
              ${this.jsonValue({
                ...(input.metadata ?? {}),
                result: metadata,
              })}::jsonb,
              ${now}
            )
          `;

          return updatedRow;
        }
      );

    return updated;
  }

  private async persistFailure(
    current: OrchestrationRow,
    input: MobilityLifecycleActionInput,
    status: MobilityOrchestrationStatus,
    step: MobilityOrchestrationStep,
    code: string,
    message: string,
    retryable: boolean
  ) {
    const now =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        const rows =
          await tx.$queryRaw<
            OrchestrationRow[]
          >`
            UPDATE
              "MobilityRideOrchestration"
            SET
              "currentStep" =
                ${step}::"MobilityOrchestrationStep",

              "status" =
                ${status}::"MobilityOrchestrationStatus",

              "version" =
                "version" + 1,

              "attemptCount" =
                "attemptCount" + 1,

              "lastErrorCode" =
                ${code},

              "lastError" =
                ${message},

              "nextRetryAt" =
                ${
                  retryable
                    ? new Date(
                        Date.now() +
                          30_000
                      )
                    : null
                },

              "updatedAt" =
                ${now}

            WHERE
              "id" =
                ${current.id}

              AND "version" =
                ${current.version}

            RETURNING *
          `;

        if (
          rows.length !==
          1
        ) {
          throw new Error(
            "Mobility orchestration concurrency conflict while persisting failure."
          );
        }

        await tx.$executeRaw`
          INSERT INTO
            "MobilityRideOrchestrationEvent" (
              "id",
              "orchestrationId",
              "organizationId",
              "rideId",
              "action",
              "fromStep",
              "toStep",
              "status",
              "idempotencyKey",
              "correlationId",
              "requestId",
              "actorUserId",
              "metadata",
              "createdAt"
            )
          VALUES (
            ${randomUUID()},
            ${current.id},
            ${input.organizationId},
            ${input.rideId},
            ${input.action},
            ${current.currentStep},
            ${step}::"MobilityOrchestrationStep",
            ${status}::"MobilityOrchestrationStatus",
            ${input.idempotencyKey},
            ${input.correlationId ?? null},
            ${input.requestId ?? null},
            ${input.actorUserId ?? null},
            ${this.jsonValue({
              ...(input.metadata ?? {}),
              errorCode:
                code,
              errorMessage:
                message,
              retryable,
            })}::jsonb,
            ${now}
          )
        `;
      }
    );
  }

  private async recordEvent(input: {
    orchestrationId: string;
    organizationId: string;
    rideId: string;
    action: string;
    fromStep:
      | MobilityOrchestrationStep
      | null;
    toStep:
      MobilityOrchestrationStep;
    status:
      MobilityOrchestrationStatus;
    idempotencyKey:
      string;
    correlationId?:
      string;
    requestId?:
      string;
    actorUserId?:
      string;
    metadata?:
      Record<string, unknown>;
  }) {
    try {
      await prisma.$executeRaw`
        INSERT INTO
          "MobilityRideOrchestrationEvent" (
            "id",
            "orchestrationId",
            "organizationId",
            "rideId",
            "action",
            "fromStep",
            "toStep",
            "status",
            "idempotencyKey",
            "correlationId",
            "requestId",
            "actorUserId",
            "metadata",
            "createdAt"
          )
        VALUES (
          ${randomUUID()},
          ${input.orchestrationId},
          ${input.organizationId},
          ${input.rideId},
          ${input.action},
          ${input.fromStep},
          ${input.toStep}::"MobilityOrchestrationStep",
          ${input.status}::"MobilityOrchestrationStatus",
          ${input.idempotencyKey},
          ${input.correlationId ?? null},
          ${input.requestId ?? null},
          ${input.actorUserId ?? null},
          ${this.jsonValue(
            input.metadata ?? {}
          )}::jsonb,
          NOW()
        )
      `;
    } catch (error) {
      if (
        String(error).includes(
          "MobilityRideOrchestrationEvent_idempotencyKey_key"
        )
      ) {
        return;
      }

      throw error;
    }
  }

  private async getByRide(
    organizationId: string,
    rideId: string
  ): Promise<OrchestrationRow | null> {
    const rows =
      await prisma.$queryRaw<
        OrchestrationRow[]
      >`
        SELECT *
        FROM
          "MobilityRideOrchestration"
        WHERE
          "organizationId" =
            ${organizationId}
          AND
          "rideId" =
            ${rideId}
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private async requireById(
    id: string
  ): Promise<OrchestrationRow> {
    const rows =
      await prisma.$queryRaw<
        OrchestrationRow[]
      >`
        SELECT *
        FROM
          "MobilityRideOrchestration"
        WHERE
          "id" =
            ${id}
        LIMIT 1
      `;

    if (!rows[0]) {
      throw new Error(
        "Mobility ride orchestration was not found."
      );
    }

    return rows[0];
  }

  private async findEvent(
    idempotencyKey: string
  ) {
    const rows =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT
          "id"
        FROM
          "MobilityRideOrchestrationEvent"
        WHERE
          "idempotencyKey" =
            ${idempotencyKey}
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private async requireRide(
    organizationId: string,
    rideId: string
  ) {
    const ride =
      await prisma.mobilityRide.findFirst({
        where: {
          id: rideId,
          organizationId,
        },

        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driverId: true,
          vehicleId: true,
          status: true,
          serviceType: true,
          currency: true,
          metadata: true,
        },
      });

    if (!ride) {
      throw new Error(
        "Mobility ride was not found."
      );
    }

    return ride;
  }

  private async getRideSafetyMode(
    organizationId: string,
    rideId: string
  ): Promise<MobilitySafetyMode> {
    const ride =
      await this.requireRide(
        organizationId,
        rideId
      );

    return this.readSafetyMode(
      ride.metadata
    );
  }

  private readSafetyMode(
    metadata:
      | Prisma.JsonValue
      | null
  ): MobilitySafetyMode {
    if (
      metadata &&
      typeof metadata ===
        "object" &&
      !Array.isArray(
        metadata
      )
    ) {
      const value =
        (
          metadata as Record<
            string,
            unknown
          >
        ).safetyMode;

      if (
        value === "TRUSTED" ||
        value === "CHILD" ||
        value === "STANDARD"
      ) {
        return value;
      }
    }

    return "STANDARD";
  }

  private getMobilityCommissionPolicy(
    serviceType: string
  ) {
    const normalized =
      serviceType
        .trim()
        .toUpperCase();

    if (
      normalized ===
        "MOTO_TAXI" ||
      normalized ===
        "MOTO-TAXI" ||
      normalized ===
        "MOTOTAXI"
    ) {
      return commissionPolicyService
        .getMotoTaxiPolicy();
    }

    return commissionPolicyService
      .getTaxiPolicy();
  }

  private result(
    row: OrchestrationRow,
    action: MobilityLifecycleAction
  ): MobilityLifecycleResult {
    return {
      orchestrationId:
        row.id,

      rideId:
        row.rideId,

      status:
        row.status,

      currentStep:
        row.currentStep,

      version:
        row.version,

      attemptCount:
        row.attemptCount,

      action,

      recoveryRequired:
        row.status ===
        "RECOVERY_REQUIRED",
    };
  }

  private validateContext(
    idempotencyKey: string,
    organizationId: string,
    rideId: string
  ) {
    if (!organizationId.trim()) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (!rideId.trim()) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (!idempotencyKey.trim()) {
      throw new Error(
        "Mobility lifecycle idempotency key is required."
      );
    }
  }

  private classifyFailure(
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Mobility lifecycle action failed.";

    const lower =
      message.toLowerCase();

    const concurrency =
      lower.includes(
        "concurrency"
      );

    const transient =
      lower.includes(
        "timeout"
      ) ||
      lower.includes(
        "temporarily"
      ) ||
      lower.includes(
        "deadlock"
      );

    const dependency =
      lower.includes(
        "provider"
      ) ||
      lower.includes(
        "database"
      ) ||
      lower.includes(
        "connection"
      );

    return {
      code:
        concurrency
          ? "MOBILITY_ORCHESTRATION_CONCURRENCY_CONFLICT"
          : transient
            ? "MOBILITY_ORCHESTRATION_TRANSIENT_FAILURE"
            : dependency
              ? "MOBILITY_ORCHESTRATION_DEPENDENCY_FAILURE"
              : "MOBILITY_ORCHESTRATION_ACTION_FAILED",

      message,

      retryable:
        concurrency ||
        transient ||
        dependency,

      classification:
        concurrency
          ? "CONCURRENCY"
          : transient
            ? "TRANSIENT"
            : dependency
              ? "DEPENDENCY"
              : "BUSINESS",
    };
  }

  private jsonValue(
    value: unknown
  ): string {
    return JSON.stringify(
      this.toJsonSafe(
        value
      )
    );
  }

  private toJsonSafe(
    value: unknown
  ): unknown {
    if (
      typeof value ===
      "bigint"
    ) {
      return value.toString();
    }

    if (
      value instanceof Date
    ) {
      return value.toISOString();
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        (item) =>
          this.toJsonSafe(
            item
          )
      );
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      return Object.fromEntries(
        Object.entries(
          value
        ).map(
          ([
            key,
            item,
          ]) => [
            key,
            this.toJsonSafe(
              item
            ),
          ]
        )
      );
    }

    return value;
  }
}

export const mobilityLifecycleService =
  new MobilityLifecycleService();
