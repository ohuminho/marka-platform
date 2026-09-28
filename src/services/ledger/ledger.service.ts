import {
  LedgerEntryDirection,
  LedgerStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import type {
  LedgerEntryFilter,
  LedgerEntryResult,
  LedgerResult,
  LedgerSummaryResult,
} from "./types/ledger.types";

class LedgerService {
  async getById(
    organizationId: string,
    ledgerId: string
  ): Promise<LedgerResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateId(ledgerId, "Ledger");

    const ledger = await prisma.ledger.findFirst({
      where: {
        id: ledgerId,
        organizationId,
      },
    });

    return ledger ? this.toLedgerResult(ledger) : null;
  }

  async getByCode(
    organizationId: string,
    code: string
  ): Promise<LedgerResult | null> {
    this.validateOrganizationId(organizationId);

    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new Error("Ledger code is required.");
    }

    const ledger = await prisma.ledger.findFirst({
      where: {
        organizationId,
        code: normalizedCode,
      },
    });

    return ledger ? this.toLedgerResult(ledger) : null;
  }

  async getOperatingLedger(
    organizationId: string,
    currency = "AOA"
  ): Promise<LedgerResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateCurrency(currency);

    const normalizedCurrency = currency.trim().toUpperCase();

    const ledger = await prisma.ledger.findFirst({
      where: {
        organizationId,
        code: `MARKA-OPERATING-${organizationId}`,
        currency: normalizedCurrency,
      },
    });

    return ledger ? this.toLedgerResult(ledger) : null;
  }

  async listEntries(
    organizationId: string,
    ledgerId: string,
    filter: LedgerEntryFilter = {}
  ): Promise<LedgerEntryResult[]> {
    this.validateOrganizationId(organizationId);
    this.validateId(ledgerId, "Ledger");

    const ledger = await prisma.ledger.findFirst({
      where: {
        id: ledgerId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!ledger) {
      return [];
    }

    const limit = this.normalizeLimit(filter.limit);
    const offset = this.normalizeOffset(filter.offset);

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId,
        accountId: filter.accountId,
        transactionId: filter.transactionId,
        direction: filter.direction as LedgerEntryDirection | undefined,
        createdAt: {
          gte: filter.from,
          lte: filter.to,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          sequence: "desc",
        },
      ],
      take: limit,
      skip: offset,
    });

    return entries.map((entry) =>
      this.toLedgerEntryResult(entry)
    );
  }

  async getTransactionEntries(
    organizationId: string,
    transactionId: string
  ): Promise<LedgerEntryResult[]> {
    this.validateOrganizationId(organizationId);
    this.validateId(transactionId, "Transaction");

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        transactionId,
        ledger: {
          organizationId,
        },
      },
      orderBy: {
        sequence: "asc",
      },
    });

    return entries.map((entry) =>
      this.toLedgerEntryResult(entry)
    );
  }

  async getSummary(
    organizationId: string,
    ledgerId: string
  ): Promise<LedgerSummaryResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateId(ledgerId, "Ledger");

    const ledger = await prisma.ledger.findFirst({
      where: {
        id: ledgerId,
        organizationId,
      },
    });

    if (!ledger) {
      return null;
    }

    const grouped = await prisma.ledgerEntry.groupBy({
      by: ["direction"],
      where: {
        ledgerId,
      },
      _sum: {
        amountMinor: true,
      },
      _count: {
        _all: true,
      },
    });

    let debitMinor = 0n;
    let creditMinor = 0n;
    let entryCount = 0;

    for (const group of grouped) {
      const amount = group._sum.amountMinor ?? 0n;
      entryCount += group._count._all;

      if (group.direction === "DEBIT") {
        debitMinor = amount;
      } else {
        creditMinor = amount;
      }
    }

    return {
      ledger: this.toLedgerResult(ledger),
      entryCount,
      debitMinor: debitMinor.toString(),
      creditMinor: creditMinor.toString(),
      netMinor: (creditMinor - debitMinor).toString(),
    };
  }

  private toLedgerResult(
    ledger: {
      id: string;
      organizationId: string;
      code: string;
      name: string;
      currency: string;
      status: LedgerStatus;
      createdAt: Date;
      updatedAt: Date;
    }
  ): LedgerResult {
    return {
      id: ledger.id,
      organizationId: ledger.organizationId,
      code: ledger.code,
      name: ledger.name,
      currency: ledger.currency,
      status: ledger.status,
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }

  private toLedgerEntryResult(
    entry: {
      id: string;
      ledgerId: string;
      transactionId: string;
      accountId: string;
      direction: LedgerEntryDirection;
      amountMinor: bigint;
      currency: string;
      sequence: number;
      metadata: unknown;
      createdAt: Date;
    }
  ): LedgerEntryResult {
    return {
      id: entry.id,
      ledgerId: entry.ledgerId,
      transactionId: entry.transactionId,
      accountId: entry.accountId,
      direction: entry.direction,
      amountMinor: entry.amountMinor.toString(),
      currency: entry.currency,
      sequence: entry.sequence,
      metadata:
        entry.metadata &&
        typeof entry.metadata === "object" &&
        !Array.isArray(entry.metadata)
          ? (entry.metadata as Record<string, unknown>)
          : null,
      createdAt: entry.createdAt,
    };
  }

  private validateOrganizationId(
    organizationId: string
  ): void {
    if (!organizationId?.trim()) {
      throw new Error("Organization is required.");
    }
  }

  private validateId(
    value: string,
    label: string
  ): void {
    if (!value?.trim()) {
      throw new Error(`${label} id is required.`);
    }
  }

  private validateCurrency(
    currency: string
  ): void {
    if (!/^[A-Z]{3}$/i.test(currency.trim())) {
      throw new Error(
        "Currency must be a valid ISO 4217 code."
      );
    }
  }

  private normalizeLimit(
    limit?: number
  ): number {
    if (limit === undefined) {
      return 50;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(
        "Ledger entry limit must be a positive integer."
      );
    }

    return Math.min(limit, 200);
  }

  private normalizeOffset(
    offset?: number
  ): number {
    if (offset === undefined) {
      return 0;
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error(
        "Ledger entry offset must be a non-negative integer."
      );
    }

    return offset;
  }
}

export const ledgerService = new LedgerService();
