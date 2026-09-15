import { Prisma } from "@prisma/client";

export type SplitAccountRole =
  | "VENDOR_PAYABLE"
  | "PLATFORM_REVENUE"
  | "PLATFORM_EXPENSE"
  | "COMMISSION"
  | "CLEARING"
  | "SETTLEMENT";

export interface SplitRule {
  role: SplitAccountRole;
  rateBps: number;
  fixedAmountMinor?: bigint;
  metadata?: Record<string, unknown>;
}

export interface SplitRequest {
  amountMinor: bigint;
  currency: string;
  rules: SplitRule[];
  metadata?: Record<string, unknown>;
}

export interface SplitAllocation {
  role: SplitAccountRole;
  amountMinor: bigint;
  rateBps: number;
  metadata?: Record<string, unknown>;
}

export interface SplitResult {
  grossAmountMinor: bigint;
  currency: string;
  allocations: SplitAllocation[];
  totalAllocatedMinor: bigint;
  remainderMinor: bigint;
  metadata?: Record<string, unknown>;
}

const BPS_TOTAL = 10_000;

export class SplitService {
  calculate(input: SplitRequest): SplitResult {
    this.validateRequest(input);

    const allocations: SplitAllocation[] = [];
    let allocatedMinor = BigInt(0);

    for (const rule of input.rules) {
      const amountMinor =
        rule.fixedAmountMinor !== undefined
          ? rule.fixedAmountMinor
          : (input.amountMinor * BigInt(rule.rateBps)) /
            BigInt(BPS_TOTAL);

      if (amountMinor < BigInt(0)) {
        throw new Error("Split allocation cannot be negative.");
      }

      allocations.push({
        role: rule.role,
        amountMinor,
        rateBps: rule.rateBps,
        metadata: rule.metadata,
      });

      allocatedMinor += amountMinor;
    }

    if (allocatedMinor > input.amountMinor) {
      throw new Error(
        "Split allocations cannot exceed the gross transaction amount."
      );
    }

    const remainderMinor = input.amountMinor - allocatedMinor;

    return {
      grossAmountMinor: input.amountMinor,
      currency: input.currency,
      allocations,
      totalAllocatedMinor: allocatedMinor,
      remainderMinor,
      metadata: input.metadata,
    };
  }

  calculateVendorCommission(input: {
    amountMinor: bigint;
    currency: string;
    vendorRateBps: number;
    markaRateBps: number;
    metadata?: Record<string, unknown>;
  }): SplitResult {
    if (
      input.vendorRateBps < 0 ||
      input.markaRateBps < 0 ||
      input.vendorRateBps + input.markaRateBps > BPS_TOTAL
    ) {
      throw new Error("Invalid vendor and MARKA split rates.");
    }

    return this.calculate({
      amountMinor: input.amountMinor,
      currency: input.currency,
      rules: [
        {
          role: "VENDOR_PAYABLE",
          rateBps: input.vendorRateBps,
        },
        {
          role: "PLATFORM_REVENUE",
          rateBps: input.markaRateBps,
        },
      ],
      metadata: input.metadata,
    });
  }

  validateComplete(result: SplitResult): void {
    if (result.totalAllocatedMinor !== result.grossAmountMinor) {
      throw new Error(
        "Split is incomplete. All gross transaction funds must be allocated."
      );
    }

    if (result.remainderMinor !== BigInt(0)) {
      throw new Error(
        "Split contains an unallocated remainder."
      );
    }
  }

  toJson(result: SplitResult): Prisma.InputJsonValue {
    const allocations: Prisma.InputJsonValue[] = result.allocations.map(
      (allocation) =>
        ({
          role: allocation.role,
          amountMinor: allocation.amountMinor.toString(),
          rateBps: allocation.rateBps,
          metadata: allocation.metadata
            ? (allocation.metadata as Prisma.InputJsonValue)
            : null,
        }) as Prisma.InputJsonValue
    );

    return {
      grossAmountMinor: result.grossAmountMinor.toString(),
      currency: result.currency,
      totalAllocatedMinor: result.totalAllocatedMinor.toString(),
      remainderMinor: result.remainderMinor.toString(),
      allocations,
      metadata: result.metadata
        ? (result.metadata as Prisma.InputJsonValue)
        : null,
    };
  }

  private validateRequest(input: SplitRequest): void {
    if (input.amountMinor <= BigInt(0)) {
      throw new Error("Split amount must be greater than zero.");
    }

    if (!/^[A-Z]{3}$/.test(input.currency)) {
      throw new Error("Currency must be a valid ISO 4217 code.");
    }

    if (input.rules.length === 0) {
      throw new Error("At least one split rule is required.");
    }

    const roles = new Set<SplitAccountRole>();

    for (const rule of input.rules) {
      if (roles.has(rule.role)) {
        throw new Error(
          `Duplicate split role: ${rule.role}.`
        );
      }

      roles.add(rule.role);

      if (
        !Number.isInteger(rule.rateBps) ||
        rule.rateBps < 0 ||
        rule.rateBps > BPS_TOTAL
      ) {
        throw new Error(
          `Invalid rate for split role: ${rule.role}.`
        );
      }

      if (
        rule.fixedAmountMinor !== undefined &&
        rule.fixedAmountMinor < BigInt(0)
      ) {
        throw new Error(
          `Fixed allocation cannot be negative: ${rule.role}.`
        );
      }

      if (
        rule.fixedAmountMinor !== undefined &&
        rule.rateBps !== 0
      ) {
        throw new Error(
          `A split rule cannot use both fixed amount and rate: ${rule.role}.`
        );
      }
    }

    const hasFixedAllocation = input.rules.some(
      (rule) => rule.fixedAmountMinor !== undefined
    );

    if (!hasFixedAllocation) {
      const totalRateBps = input.rules.reduce(
        (total, rule) => total + rule.rateBps,
        0
      );

      if (totalRateBps !== BPS_TOTAL) {
        throw new Error(
          `Split rates must total exactly ${BPS_TOTAL} basis points. Received ${totalRateBps}.`
        );
      }
    }
  }
}

export const splitService = new SplitService();
