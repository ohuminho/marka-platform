import {
  MobilityRideStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/database/client/prisma";

import {
  mobilityPaymentEngineService,
} from "@/services/mobility/payments/mobility-payment-engine.service";

import {
  mobilitySettlementEngineService,
} from "@/services/mobility/settlement/mobility-settlement-engine.service";

import type {
  MobilityPaymentResult,
} from "@/services/mobility/payments/mobility-payment-engine.contracts";

import type {
  MobilitySettlementEngineResult,
} from "@/services/mobility/settlement/mobility-settlement-engine.contracts";

import type {
  InitializeMobilityFinancialsInput,
  FinalizeMobilityFinancialsInput,
  MobilityFinancialOrchestrationResult,
} from "@/services/mobility/finance/mobility-financial-orchestrator.contracts";

export class MobilityFinancialOrchestratorService {
  async initializeRideFinancials(
    input: InitializeMobilityFinancialsInput
  ): Promise<MobilityFinancialOrchestrationResult> {
    this.validateInitializeInput(
      input
    );

    const ride =
      await this.requireRide(
        input.organizationId,
        input.rideId
      );

    if (
      ride.riderId !==
      input.riderId
    ) {
      throw new Error(
        "Mobility financial initialization rider does not match the ride."
      );
    }

    if (
      input.driverId &&
      ride.driverId !==
      input.driverId
    ) {
      throw new Error(
        "Mobility financial initialization driver does not match the ride."
      );
    }

    const payment =
      await mobilityPaymentEngineService.createPayment({
        organizationId:
          input.organizationId,

        rideId:
          input.rideId,

        riderId:
          input.riderId,

        driverId:
          input.driverId ??
          ride.driverId ??
          undefined,

        paymentMethod:
          input.paymentMethod,

        currency:
          input.currency,

        estimatedFareMinor:
          input.estimatedFareMinor,

        finalFareMinor:
          input.finalFareMinor,

        commissionRateBps:
          input.commissionRateBps,

        pricingSnapshot:
          input.pricingSnapshot,

        metadata: {
          ...(input.metadata ?? {}),

          orchestration:
            "MOBILITY_FINANCIAL_ORCHESTRATOR",
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

    return {
      payment,

      settlement:
        null,

      financialState:
        payment.status ===
        "COLLECTED"
          ? "PAYMENT_COLLECTED"
          : "PAYMENT_INITIALIZED",

      paymentMethod:
        payment.paymentMethod,

      grossFareMinor:
        payment.finalFareMinor,

      commissionAmountMinor:
        payment.commissionAmountMinor,

      driverNetAmountMinor:
        payment.driverNetMinor,

      cashObligationCreatedMinor:
        "0",

      cashObligationSettledMinor:
        "0",
    };
  }

  async finalizeRideFinancials(
    input: FinalizeMobilityFinancialsInput
  ): Promise<MobilityFinancialOrchestrationResult> {
    this.validateFinalizeInput(
      input
    );

    const ride =
      await this.requireRide(
        input.organizationId,
        input.rideId
      );

    if (
      ride.status !==
      MobilityRideStatus.TRIP_COMPLETED
    ) {
      throw new Error(
        `Mobility financial finalization requires a completed ride. Current ride status: ${ride.status}.`
      );
    }

    const existingPayment =
      await mobilityPaymentEngineService.getByRide(
        input.rideId
      );

    if (!existingPayment) {
      throw new Error(
        "Mobility payment must be initialized before financial finalization."
      );
    }

    if (
      existingPayment.organizationId !==
      input.organizationId
    ) {
      throw new Error(
        "Mobility payment does not belong to the specified organization."
      );
    }

    if (
      existingPayment.riderId !==
      ride.riderId
    ) {
      throw new Error(
        "Mobility payment rider does not match the completed ride."
      );
    }

    if (
      ride.driverId &&
      existingPayment.driverId &&
      ride.driverId !==
      existingPayment.driverId
    ) {
      throw new Error(
        "Mobility payment driver does not match the completed ride."
      );
    }

    let payment =
      existingPayment;

    if (
      payment.status !==
      "COLLECTED" &&
      payment.status !==
      "SETTLED"
    ) {
      payment =
        await mobilityPaymentEngineService.completePayment({
          organizationId:
            input.organizationId,

          rideId:
            input.rideId,

          finalFareMinor:
            input.finalFareMinor,

          /**
           * Use the commission rate already
           * attached to the payment.
           *
           * This prevents a later policy change
           * from changing the economics of an
           * already-created ride.
           */
          commissionRateBps:
            payment.commissionRateBps,

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

          metadata: {
            ...(input.metadata ?? {}),

            orchestration:
              "MOBILITY_FINANCIAL_ORCHESTRATOR",

            finalizedBy:
              "RIDE_COMPLETION",
          },
        });
    }

    if (
      payment.status ===
      "SETTLED"
    ) {
      const existingSettlement =
        await mobilitySettlementEngineService.getByPayment(
          payment.id
        );

      return {
        payment,

        settlement:
          existingSettlement
            ? {
                settlement:
                  existingSettlement,

                paymentStatus:
                  "SETTLED",

                cashObligationCreatedMinor:
                  existingSettlement
                    .cashObligationAmountMinor,

                cashObligationSettledMinor:
                  existingSettlement
                    .cashObligationSettledMinor,

                driverNetAmountMinor:
                  existingSettlement
                    .driverNetAmountMinor,
              }
            : null,

        financialState:
          "SETTLEMENT_COMPLETED",

        paymentMethod:
          payment.paymentMethod,

        grossFareMinor:
          payment.finalFareMinor,

        commissionAmountMinor:
          payment.commissionAmountMinor,

        driverNetAmountMinor:
          payment.driverNetMinor,

        cashObligationCreatedMinor:
          existingSettlement
            ?.cashObligationAmountMinor ??
          "0",

        cashObligationSettledMinor:
          existingSettlement
            ?.cashObligationSettledMinor ??
          "0",
      };
    }

    const settlement =
      await mobilitySettlementEngineService.createSettlement({
        organizationId:
          input.organizationId,

        paymentId:
          payment.id,

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

        idempotencyKey:
          input.settlementIdempotencyKey,

        metadata: {
          ...(input.metadata ?? {}),

          orchestration:
            "MOBILITY_FINANCIAL_ORCHESTRATOR",

          rideCompletion:
            true,
        },
      });

    const completedSettlement =
      await mobilitySettlementEngineService.completeSettlement({
        organizationId:
          input.organizationId,

        paymentId:
          payment.id,

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

        idempotencyKey:
          input.settlementCompletionIdempotencyKey,

        availableDigitalProceedsMinor:
          payment.paymentMethod ===
          "DIGITAL"
            ? input.availableDigitalProceedsMinor
            : undefined,

        sourceReference:
          payment.paymentMethod ===
          "DIGITAL"
            ? input.sourceReference
            : undefined,

        metadata: {
          ...(input.metadata ?? {}),

          orchestration:
            "MOBILITY_FINANCIAL_ORCHESTRATOR",

          settlementId:
            settlement.id,

          rideCompletion:
            true,
        },
      });

    return {
      payment: {
        ...payment,

        status:
          completedSettlement.paymentStatus,

        settledAt:
          completedSettlement
            .settlement
            .completedAt,
      },

      settlement:
        completedSettlement,

      financialState:
        "SETTLEMENT_COMPLETED",

      paymentMethod:
        payment.paymentMethod,

      grossFareMinor:
        payment.finalFareMinor,

      commissionAmountMinor:
        payment.commissionAmountMinor,

      driverNetAmountMinor:
        completedSettlement
          .driverNetAmountMinor,

      cashObligationCreatedMinor:
        completedSettlement
          .cashObligationCreatedMinor,

      cashObligationSettledMinor:
        completedSettlement
          .cashObligationSettledMinor,
    };
  }

  private async requireRide(
    organizationId: string,
    rideId: string
  ): Promise<{
    id: string;
    organizationId: string;
    riderId: string;
    driverId: string | null;
    status: MobilityRideStatus;
    currency: string;
  }> {
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
          status: true,
          currency: true,
        },
      });

    if (!ride) {
      throw new Error(
        "Mobility ride was not found."
      );
    }

    return ride;
  }

  private validateInitializeInput(
    input: InitializeMobilityFinancialsInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (
      !input.riderId.trim()
    ) {
      throw new Error(
        "Mobility riderId is required."
      );
    }

    if (
      !input.currency.trim()
    ) {
      throw new Error(
        "Mobility currency is required."
      );
    }

    if (
      input.estimatedFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Estimated fare cannot be negative."
      );
    }

    if (
      input.finalFareMinor !==
        undefined &&
      input.finalFareMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative."
      );
    }

    if (
      !Number.isInteger(
        input.commissionRateBps
      ) ||
      input.commissionRateBps < 0 ||
      input.commissionRateBps > 10_000
    ) {
      throw new Error(
        "Mobility commission rate must be between 0 and 10000 basis points."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility financial initialization idempotency key is required."
      );
    }
  }

  private validateFinalizeInput(
    input: FinalizeMobilityFinancialsInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (
      input.finalFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative."
      );
    }

    if (
      input.availableDigitalProceedsMinor !==
        undefined &&
      input.availableDigitalProceedsMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Available digital proceeds cannot be negative."
      );
    }

    if (
      !input.paymentIdempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility payment idempotency key is required."
      );
    }

    if (
      !input.settlementIdempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility settlement idempotency key is required."
      );
    }

    if (
      !input.settlementCompletionIdempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility settlement completion idempotency key is required."
      );
    }
  }
}

export const mobilityFinancialOrchestratorService =
  new MobilityFinancialOrchestratorService();
