import {
  AccountStatus,
  AccountType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { FinancialAuditService } from "@/core/audit/financial-audit.service";

const financialAuditService = new FinancialAuditService();

export interface CreateAccountInput {
  organizationId: string;
  type: AccountType;
  code: string;
  currency?: string;
  userId?: string;
  vendorId?: string;
  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountResult {
  id: string;
  organizationId: string;
  userId: string | null;
  vendorId: string | null;
  type: AccountType;
  code: string;
  currency: string;
  status: AccountStatus;
  balanceMinor: string;
  heldBalanceMinor: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnsureVendorPayableAccountInput {
  organizationId: string;
  vendorId: string;
  currency?: string;
  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
}

export interface EnsureSettlementAccountInput {
  organizationId: string;
  currency?: string;
  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
}

class AccountService {
  async create(input: CreateAccountInput): Promise<AccountResult> {
    this.validateOrganizationId(input.organizationId);
    this.validateCode(input.code);

    const currency = this.normalizeCurrency(input.currency);

    if (input.userId && input.vendorId) {
      throw new Error(
        "An account cannot belong to both a user and a vendor."
      );
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: input.organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new Error("Active organization not found.");
    }

    if (input.userId) {
      const user = await prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new Error("Account owner user not found.");
      }
    }

    if (input.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: input.vendorId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!vendor) {
        throw new Error(
          "Vendor not found in the specified organization."
        );
      }
    }

    const existing = await prisma.account.findUnique({
      where: {
        code: input.code,
      },
    });

    if (existing) {
      throw new Error(
        `An account with code "${input.code}" already exists.`
      );
    }

    const account = await prisma.account.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        vendorId: input.vendorId,
        type: input.type,
        code: input.code,
        currency,
        status: AccountStatus.ACTIVE,
        balanceMinor: BigInt(0),
        heldBalanceMinor: BigInt(0),
        version: 0,
      },
    });

    await financialAuditService.recordAccount({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      accountId: account.id,
      action: "ACCOUNT_CREATED",
      correlationId: input.correlationId,
      requestId: input.requestId,
      metadata: {
        accountId: account.id,
        accountType: account.type,
        code: account.code,
        currency: account.currency,
        userId: account.userId,
        vendorId: account.vendorId,
        ...(input.metadata ?? {}),
      },
    });

    return this.toResult(account);
  }

  async getById(
    organizationId: string,
    accountId: string
  ): Promise<AccountResult | null> {
    this.validateOrganizationId(organizationId);

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    });

    if (!account) {
      return null;
    }

    return this.toResult(account);
  }

  async getByCode(
    organizationId: string,
    code: string
  ): Promise<AccountResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateCode(code);

    const account = await prisma.account.findFirst({
      where: {
        organizationId,
        code,
      },
    });

    if (!account) {
      return null;
    }

    return this.toResult(account);
  }

  async getVendorPayableAccount(
    organizationId: string,
    vendorId: string,
    currency = "AOA"
  ): Promise<AccountResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateCurrency(currency);

    const account = await prisma.account.findFirst({
      where: {
        organizationId,
        vendorId,
        type: AccountType.VENDOR_PAYABLE,
        currency: currency.trim().toUpperCase(),
        status: AccountStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!account) {
      return null;
    }

    return this.toResult(account);
  }

  async getSettlementAccount(
    organizationId: string,
    currency = "AOA"
  ): Promise<AccountResult | null> {
    this.validateOrganizationId(organizationId);
    this.validateCurrency(currency);

    const account = await prisma.account.findFirst({
      where: {
        organizationId,
        type: AccountType.SETTLEMENT,
        currency: currency.trim().toUpperCase(),
        status: AccountStatus.ACTIVE,
        userId: null,
        vendorId: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!account) {
      return null;
    }

    return this.toResult(account);
  }

  async ensureVendorPayableAccount(
    input: EnsureVendorPayableAccountInput
  ): Promise<AccountResult> {
    this.validateOrganizationId(input.organizationId);
    this.validateCurrency(input.currency ?? "AOA");

    const currency = this.normalizeCurrency(input.currency);

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: input.vendorId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!vendor) {
      throw new Error(
        "Vendor not found in the specified organization."
      );
    }

    const existing = await this.getVendorPayableAccount(
      input.organizationId,
      input.vendorId,
      currency
    );

    if (existing) {
      return existing;
    }

    const code = this.buildVendorPayableCode(
      input.vendorId,
      currency
    );

    const existingByCode = await prisma.account.findUnique({
      where: {
        code,
      },
    });

    if (existingByCode) {
      if (
        existingByCode.organizationId !== input.organizationId ||
        existingByCode.vendorId !== input.vendorId ||
        existingByCode.type !== AccountType.VENDOR_PAYABLE ||
        existingByCode.currency !== currency
      ) {
        throw new Error(
          `Account code collision detected for "${code}".`
        );
      }

      return this.toResult(existingByCode);
    }

    return this.create({
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      type: AccountType.VENDOR_PAYABLE,
      code,
      currency,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      requestId: input.requestId,
      metadata: {
        provisioning: "VENDOR_PAYABLE",
        vendorName: vendor.name,
      },
    });
  }

  async ensureSettlementAccount(
    input: EnsureSettlementAccountInput
  ): Promise<AccountResult> {
    this.validateOrganizationId(input.organizationId);
    this.validateCurrency(input.currency ?? "AOA");

    const currency = this.normalizeCurrency(input.currency);

    const existing = await this.getSettlementAccount(
      input.organizationId,
      currency
    );

    if (existing) {
      return existing;
    }

    const code = this.buildSettlementCode(
      input.organizationId,
      currency
    );

    const existingByCode = await prisma.account.findUnique({
      where: {
        code,
      },
    });

    if (existingByCode) {
      if (
        existingByCode.organizationId !== input.organizationId ||
        existingByCode.type !== AccountType.SETTLEMENT ||
        existingByCode.currency !== currency ||
        existingByCode.userId !== null ||
        existingByCode.vendorId !== null
      ) {
        throw new Error(
          `Account code collision detected for "${code}".`
        );
      }

      return this.toResult(existingByCode);
    }

    return this.create({
      organizationId: input.organizationId,
      type: AccountType.SETTLEMENT,
      code,
      currency,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      requestId: input.requestId,
      metadata: {
        provisioning: "ORGANIZATION_SETTLEMENT",
      },
    });
  }

  async listByOrganization(
    organizationId: string,
    options?: {
      type?: AccountType;
      currency?: string;
      status?: AccountStatus;
      vendorId?: string;
      userId?: string;
    }
  ): Promise<AccountResult[]> {
    this.validateOrganizationId(organizationId);

    if (options?.currency) {
      this.validateCurrency(options.currency);
    }

    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        type: options?.type,
        currency: options?.currency
          ? this.normalizeCurrency(options.currency)
          : undefined,
        status: options?.status,
        vendorId: options?.vendorId,
        userId: options?.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return accounts.map((account) => this.toResult(account));
  }

  async freeze(
    organizationId: string,
    accountId: string,
    actorUserId?: string,
    correlationId?: string,
    requestId?: string
  ): Promise<AccountResult> {
    const account = await this.getRequiredAccount(
      organizationId,
      accountId
    );

    if (account.status === AccountStatus.CLOSED) {
      throw new Error("Closed accounts cannot be frozen.");
    }

    if (account.status === AccountStatus.FROZEN) {
      return this.toResult(account);
    }

    const updated = await prisma.account.update({
      where: {
        id: accountId,
      },
      data: {
        status: AccountStatus.FROZEN,
      },
    });

    await financialAuditService.recordAccount({
      organizationId,
      actorUserId,
      accountId,
      action: "ACCOUNT_FROZEN",
      correlationId,
      requestId,
      metadata: {
        previousStatus: account.status,
        newStatus: updated.status,
      },
    });

    return this.toResult(updated);
  }

  async activate(
    organizationId: string,
    accountId: string,
    actorUserId?: string,
    correlationId?: string,
    requestId?: string
  ): Promise<AccountResult> {
    const account = await this.getRequiredAccount(
      organizationId,
      accountId
    );

    if (account.status === AccountStatus.CLOSED) {
      throw new Error("Closed accounts cannot be activated.");
    }

    if (account.status === AccountStatus.ACTIVE) {
      return this.toResult(account);
    }

    const updated = await prisma.account.update({
      where: {
        id: accountId,
      },
      data: {
        status: AccountStatus.ACTIVE,
      },
    });

    await financialAuditService.recordAccount({
      organizationId,
      actorUserId,
      accountId,
      action: "ACCOUNT_ACTIVATED",
      correlationId,
      requestId,
      metadata: {
        previousStatus: account.status,
        newStatus: updated.status,
      },
    });

    return this.toResult(updated);
  }

  private async getRequiredAccount(
    organizationId: string,
    accountId: string
  ) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    });

    if (!account) {
      throw new Error("Account not found.");
    }

    return account;
  }

  private buildVendorPayableCode(
    vendorId: string,
    currency: string
  ): string {
    return `VENDOR-PAYABLE-${vendorId}-${currency}`;
  }

  private buildSettlementCode(
    organizationId: string,
    currency: string
  ): string {
    return `SETTLEMENT-${organizationId}-${currency}`;
  }

  private normalizeCurrency(currency?: string): string {
    const normalized = (currency ?? "AOA").trim().toUpperCase();

    this.validateCurrency(normalized);

    return normalized;
  }

  private validateOrganizationId(organizationId: string): void {
    if (!organizationId?.trim()) {
      throw new Error("Organization is required.");
    }
  }

  private validateCode(code: string): void {
    if (!code?.trim()) {
      throw new Error("Account code is required.");
    }

    if (code.length > 255) {
      throw new Error("Account code cannot exceed 255 characters.");
    }
  }

  private validateCurrency(currency: string): void {
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      throw new Error("Currency must be a valid ISO 4217 code.");
    }
  }

  private toResult(account: {
    id: string;
    organizationId: string;
    userId: string | null;
    vendorId: string | null;
    type: AccountType;
    code: string;
    currency: string;
    status: AccountStatus;
    balanceMinor: bigint;
    heldBalanceMinor: bigint;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): AccountResult {
    return {
      id: account.id,
      organizationId: account.organizationId,
      userId: account.userId,
      vendorId: account.vendorId,
      type: account.type,
      code: account.code,
      currency: account.currency,
      status: account.status,
      balanceMinor: account.balanceMinor.toString(),
      heldBalanceMinor: account.heldBalanceMinor.toString(),
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

export const accountService = new AccountService();
