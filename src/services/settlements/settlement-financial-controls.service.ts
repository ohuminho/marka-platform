import {
  ReconciliationStatus,
  SettlementStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/database/client/prisma";

export type FinancialControlSeverity =
  | "INFO"
  | "WARNING"
  | "CRITICAL";

export type FinancialControlType =
  | "SETTLEMENT_PENDING_TOO_LONG"
  | "SETTLEMENT_PROCESSING_TOO_LONG"
  | "SETTLEMENT_FAILED"
  | "SETTLEMENT_COMPLETED_WITHOUT_PROVIDER_REFERENCE"
  | "RECONCILIATION_MISMATCH"
  | "RECONCILIATION_MISMATCH_TOO_LONG"
  | "RECONCILIATION_UNRESOLVED";

export interface FinancialControlFinding {
  type: FinancialControlType;
  severity: FinancialControlSeverity;

  settlementId: string | null;
  reconciliationId: string | null;
  vendorId: string | null;

  provider: string | null;
  currency: string | null;

  amountMinor: string | null;
  differenceMinor: string | null;

  ageMinutes: number;

  message: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementFinancialControlsResult {
  organizationId: string;
  generatedAt: Date;

  totals: {
    settlements: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    reconciled: number;

    reconciliations: number;
    matched: number;
    mismatches: number;
    unresolved: number;
  };

  findings: FinancialControlFinding[];
}

interface SettlementControlRecord {
  id: string;
  vendorId: string;
  amountMinor: bigint;
  currency: string;
  status: SettlementStatus;
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;

  reconciliation: {
    id: string;
    status: ReconciliationStatus;
    provider: string;
    actualMinor: bigint;
    differenceMinor: bigint;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

const CONTROL_THRESHOLDS = {
  settlementPendingMinutes: 24 * 60,
  settlementProcessingMinutes: 2 * 60,
  reconciliationMismatchMinutes: 24 * 60,
} as const;

export class SettlementFinancialControlsService {
  async inspect(
    organizationId: string
  ): Promise<SettlementFinancialControlsResult> {
    this.validateOrganizationId(
      organizationId
    );

    const settlements =
      await prisma.settlement.findMany({
        where: {
          vendor: {
            organizationId,
          },
        },
        select: {
          id: true,
          vendorId: true,
          amountMinor: true,
          currency: true,
          status: true,
          providerReference: true,
          createdAt: true,
          updatedAt: true,
          reconciliation: {
            select: {
              id: true,
              status: true,
              provider: true,
              actualMinor: true,
              differenceMinor: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
      });

    const now = new Date();

    const totals = {
      settlements: settlements.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      reconciled: 0,

      reconciliations: 0,
      matched: 0,
      mismatches: 0,
      unresolved: 0,
    };

    const findings: FinancialControlFinding[] = [];

    for (const settlement of settlements) {
      this.accumulateSettlementTotals(
        settlement,
        totals
      );

      const settlementAgeMinutes =
        this.ageInMinutes(
          settlement.updatedAt,
          now
        );

      if (
        settlement.status ===
          SettlementStatus.PENDING &&
        settlementAgeMinutes >=
          CONTROL_THRESHOLDS.settlementPendingMinutes
      ) {
        findings.push(
          this.createFinding({
            type:
              "SETTLEMENT_PENDING_TOO_LONG",
            severity:
              "WARNING",
            settlement,
            ageMinutes:
              settlementAgeMinutes,
            message:
              "Settlement has remained pending beyond the operational threshold.",
          })
        );
      }

      if (
        settlement.status ===
          SettlementStatus.PROCESSING &&
        settlementAgeMinutes >=
          CONTROL_THRESHOLDS.settlementProcessingMinutes
      ) {
        findings.push(
          this.createFinding({
            type:
              "SETTLEMENT_PROCESSING_TOO_LONG",
            severity:
              "CRITICAL",
            settlement,
            ageMinutes:
              settlementAgeMinutes,
            message:
              "Settlement payout has remained in processing beyond the operational threshold.",
          })
        );
      }

      if (
        settlement.status ===
        SettlementStatus.FAILED
      ) {
        findings.push(
          this.createFinding({
            type:
              "SETTLEMENT_FAILED",
            severity:
              "CRITICAL",
            settlement,
            ageMinutes:
              settlementAgeMinutes,
            message:
              "Settlement is in a failed state and requires operational review.",
          })
        );
      }

      if (
        (settlement.status ===
          SettlementStatus.COMPLETED ||
          settlement.status ===
            SettlementStatus.RECONCILED) &&
        !settlement.providerReference
      ) {
        findings.push(
          this.createFinding({
            type:
              "SETTLEMENT_COMPLETED_WITHOUT_PROVIDER_REFERENCE",
            severity:
              "CRITICAL",
            settlement,
            ageMinutes:
              settlementAgeMinutes,
            message:
              "Settlement is completed but has no external provider reference.",
          })
        );
      }

      if (
        settlement.reconciliation
      ) {
        totals.reconciliations += 1;

        if (
          settlement.reconciliation.status ===
          ReconciliationStatus.MATCHED
        ) {
          totals.matched += 1;
        }

        if (
          settlement.reconciliation.status ===
          ReconciliationStatus.MISMATCH
        ) {
          totals.mismatches += 1;

          const reconciliationAgeMinutes =
            this.ageInMinutes(
              settlement.reconciliation.updatedAt,
              now
            );

          findings.push(
            this.createReconciliationFinding({
              type:
                "RECONCILIATION_MISMATCH",
              severity:
                reconciliationAgeMinutes >=
                CONTROL_THRESHOLDS.reconciliationMismatchMinutes
                  ? "CRITICAL"
                  : "WARNING",
              settlement,
              ageMinutes:
                reconciliationAgeMinutes,
              message:
                reconciliationAgeMinutes >=
                CONTROL_THRESHOLDS.reconciliationMismatchMinutes
                  ? "Settlement reconciliation mismatch has remained unresolved beyond the operational threshold."
                  : "Settlement reconciliation contains a financial mismatch.",
            })
          );

          if (
            reconciliationAgeMinutes >=
            CONTROL_THRESHOLDS.reconciliationMismatchMinutes
          ) {
            findings.push(
              this.createReconciliationFinding({
                type:
                  "RECONCILIATION_MISMATCH_TOO_LONG",
                severity:
                  "CRITICAL",
                settlement,
                ageMinutes:
                  reconciliationAgeMinutes,
                message:
                  "Reconciliation mismatch requires immediate operational attention.",
              })
            );
          }
        }

        if (
          settlement.reconciliation.status ===
          ReconciliationStatus.RESOLVED
        ) {
          totals.unresolved += 0;
        } else if (
          settlement.reconciliation.status ===
            ReconciliationStatus.MISMATCH ||
          settlement.reconciliation.status ===
            ReconciliationStatus.IN_PROGRESS ||
          settlement.reconciliation.status ===
            ReconciliationStatus.PENDING
        ) {
          totals.unresolved += 1;
        }

        if (
          settlement.reconciliation.status ===
            ReconciliationStatus.PENDING ||
          settlement.reconciliation.status ===
            ReconciliationStatus.IN_PROGRESS
        ) {
          findings.push(
            this.createReconciliationFinding({
              type:
                "RECONCILIATION_UNRESOLVED",
              severity:
                "WARNING",
              settlement,
              ageMinutes:
                this.ageInMinutes(
                  settlement.reconciliation.updatedAt,
                  now
                ),
              message:
                "Settlement reconciliation has not reached a terminal state.",
            })
          );
        }
      }
    }

    return {
      organizationId,
      generatedAt: now,
      totals,
      findings,
    };
  }

  private accumulateSettlementTotals(
    settlement: SettlementControlRecord,
    totals: SettlementFinancialControlsResult["totals"]
  ): void {
    switch (settlement.status) {
      case SettlementStatus.PENDING:
        totals.pending += 1;
        break;

      case SettlementStatus.PROCESSING:
        totals.processing += 1;
        break;

      case SettlementStatus.COMPLETED:
        totals.completed += 1;
        break;

      case SettlementStatus.FAILED:
        totals.failed += 1;
        break;

      case SettlementStatus.RECONCILED:
        totals.reconciled += 1;
        break;
    }
  }

  private createFinding({
    type,
    severity,
    settlement,
    ageMinutes,
    message,
  }: {
    type: FinancialControlType;
    severity: FinancialControlSeverity;
    settlement: SettlementControlRecord;
    ageMinutes: number;
    message: string;
  }): FinancialControlFinding {
    return {
      type,
      severity,
      settlementId:
        settlement.id,
      reconciliationId:
        settlement.reconciliation?.id ??
        null,
      vendorId:
        settlement.vendorId,
      provider:
        settlement.reconciliation?.provider ??
        null,
      currency:
        settlement.currency,
      amountMinor:
        settlement.amountMinor.toString(),
      differenceMinor:
        settlement.reconciliation
          ?.differenceMinor
          .toString() ??
        null,
      ageMinutes,
      message,
      createdAt:
        settlement.createdAt,
      updatedAt:
        settlement.updatedAt,
    };
  }

  private createReconciliationFinding({
    type,
    severity,
    settlement,
    ageMinutes,
    message,
  }: {
    type: FinancialControlType;
    severity: FinancialControlSeverity;
    settlement: SettlementControlRecord;
    ageMinutes: number;
    message: string;
  }): FinancialControlFinding {
    return {
      type,
      severity,
      settlementId:
        settlement.id,
      reconciliationId:
        settlement.reconciliation?.id ??
        null,
      vendorId:
        settlement.vendorId,
      provider:
        settlement.reconciliation?.provider ??
        null,
      currency:
        settlement.currency,
      amountMinor:
        settlement.amountMinor.toString(),
      differenceMinor:
        settlement.reconciliation
          ?.differenceMinor
          .toString() ??
        null,
      ageMinutes,
      message,
      createdAt:
        settlement.reconciliation
          ?.createdAt ??
        settlement.createdAt,
      updatedAt:
        settlement.reconciliation
          ?.updatedAt ??
        settlement.updatedAt,
    };
  }

  private ageInMinutes(
    from: Date,
    to: Date
  ): number {
    return Math.max(
      0,
      Math.floor(
        (to.getTime() -
          from.getTime()) /
          60000
      )
    );
  }

  private validateOrganizationId(
    organizationId: string
  ): void {
    if (!organizationId.trim()) {
      throw new Error(
        "Organization ID is required."
      );
    }
  }
}

export const settlementFinancialControlsService =
  new SettlementFinancialControlsService();
