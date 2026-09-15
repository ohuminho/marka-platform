import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";

export type FinancialInstrumentType =
  | "BANK_ACCOUNT"
  | "CARD"
  | "MOBILE_MONEY"
  | "PSP_ACCOUNT"
  | "OTHER";

export type FinancialInstrumentOwnerType =
  | "USER"
  | "VENDOR"
  | "ORGANIZATION";

export type FinancialInstrumentStatus =
  | "PENDING"
  | "ACTIVE"
  | "VERIFICATION_REQUIRED"
  | "SUSPENDED"
  | "BLOCKED"
  | "EXPIRED"
  | "REMOVED";

export interface CreateFinancialInstrumentInput {
  organizationId: string;
  ownerType: FinancialInstrumentOwnerType;
  userId?: string;
  vendorId?: string;
  type: FinancialInstrumentType;
  provider: string;
  providerRef: string;
  displayName?: string;
  maskedValue?: string;
  currency?: string;
  capabilities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FinancialInstrumentSummary {
  id: string;
  organizationId: string;
  ownerType: FinancialInstrumentOwnerType;
  userId: string | null;
  vendorId: string | null;
  type: FinancialInstrumentType;
  status: FinancialInstrumentStatus;
  provider: string;
  providerRef: string;
  displayName: string | null;
  maskedValue: string | null;
  currency: string;
  isDefault: boolean;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  capabilities: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class FinancialInstrumentService {
  async create(
    input: CreateFinancialInstrumentInput
  ): Promise<FinancialInstrumentSummary> {
    this.validateCreateInput(input);

    const organization =
      await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true, status: true },
      });

    if (!organization || organization.status !== "ACTIVE") {
      throw new Error("Organization is not active.");
    }

    await this.validateOwner(input);

    const provider = input.provider.trim();
    const providerRef = input.providerRef.trim();

    const existing =
      await prisma.financialInstrument.findUnique({
        where: {
          provider_providerRef: {
            provider,
            providerRef,
          },
        },
      });

    if (existing) {
      throw new Error(
        "This financial instrument is already registered."
      );
    }

    const instrument =
      await prisma.financialInstrument.create({
        data: {
          organizationId: input.organizationId,
          ownerType: input.ownerType,
          userId: input.userId,
          vendorId: input.vendorId,
          type: input.type,
          status: "PENDING",
          provider,
          providerRef,
          displayName: input.displayName?.trim() || undefined,
          maskedValue: input.maskedValue?.trim() || undefined,
          currency: this.normalizeCurrency(input.currency),
          capabilities: this.toJsonInput(input.capabilities),
          metadata: this.toJsonInput(input.metadata),
          isDefault: false,
        },
      });

    return this.toSummary(instrument);
  }

  async getById(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary | null> {
    if (!instrumentId.trim()) {
      throw new Error("Financial instrument ID is required.");
    }

    const instrument =
      await prisma.financialInstrument.findUnique({
        where: { id: instrumentId },
      });

    if (!instrument) return null;

    return this.toSummary(instrument);
  }

  async listForUser(
    userId: string,
    organizationId?: string
  ): Promise<FinancialInstrumentSummary[]> {
    if (!userId.trim()) {
      throw new Error("User ID is required.");
    }

    const instruments =
      await prisma.financialInstrument.findMany({
        where: {
          userId,
          ...(organizationId ? { organizationId } : {}),
          status: {
            not: "REMOVED",
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "desc" },
        ],
      });

    return instruments.map((instrument) =>
      this.toSummary(instrument)
    );
  }

  async listForVendor(
    vendorId: string,
    organizationId?: string
  ): Promise<FinancialInstrumentSummary[]> {
    if (!vendorId.trim()) {
      throw new Error("Vendor ID is required.");
    }

    const instruments =
      await prisma.financialInstrument.findMany({
        where: {
          vendorId,
          ...(organizationId ? { organizationId } : {}),
          status: {
            not: "REMOVED",
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "desc" },
        ],
      });

    return instruments.map((instrument) =>
      this.toSummary(instrument)
    );
  }

  async verify(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary> {
    const instrument =
      await prisma.financialInstrument.findUnique({
        where: { id: instrumentId },
      });

    if (!instrument) {
      throw new Error("Financial instrument not found.");
    }

    if (instrument.status === "BLOCKED") {
      throw new Error(
        "A blocked financial instrument cannot be verified."
      );
    }

    if (instrument.status === "REMOVED") {
      throw new Error(
        "A removed financial instrument cannot be verified."
      );
    }

    const updated =
      await prisma.financialInstrument.update({
        where: { id: instrumentId },
        data: {
          status: "ACTIVE",
          verifiedAt: new Date(),
        },
      });

    return this.toSummary(updated);
  }

  async suspend(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary> {
    const instrument =
      await prisma.financialInstrument.findUnique({
        where: { id: instrumentId },
      });

    if (!instrument) {
      throw new Error("Financial instrument not found.");
    }

    if (instrument.status === "REMOVED") {
      throw new Error(
        "A removed financial instrument cannot be suspended."
      );
    }

    const updated =
      await prisma.financialInstrument.update({
        where: { id: instrumentId },
        data: {
          status: "SUSPENDED",
          isDefault: false,
        },
      });

    return this.toSummary(updated);
  }

  async block(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary> {
    const instrument =
      await prisma.financialInstrument.findUnique({
        where: { id: instrumentId },
      });

    if (!instrument) {
      throw new Error("Financial instrument not found.");
    }

    const updated =
      await prisma.financialInstrument.update({
        where: { id: instrumentId },
        data: {
          status: "BLOCKED",
          isDefault: false,
        },
      });

    return this.toSummary(updated);
  }

  async remove(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary> {
    const instrument =
      await prisma.financialInstrument.findUnique({
        where: { id: instrumentId },
      });

    if (!instrument) {
      throw new Error("Financial instrument not found.");
    }

    const updated =
      await prisma.financialInstrument.update({
        where: { id: instrumentId },
        data: {
          status: "REMOVED",
          isDefault: false,
        },
      });

    return this.toSummary(updated);
  }

  async setDefault(
    instrumentId: string
  ): Promise<FinancialInstrumentSummary> {
    return prisma.$transaction(async (tx) => {
      const instrument =
        await tx.financialInstrument.findUnique({
          where: { id: instrumentId },
        });

      if (!instrument) {
        throw new Error(
          "Financial instrument not found."
        );
      }

      if (instrument.status !== "ACTIVE") {
        throw new Error(
          "Only an active financial instrument can be the default."
        );
      }

      await tx.financialInstrument.updateMany({
        where: {
          organizationId: instrument.organizationId,
          userId: instrument.userId,
          vendorId: instrument.vendorId,
          status: "ACTIVE",
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      const updated =
        await tx.financialInstrument.update({
          where: { id: instrumentId },
          data: {
            isDefault: true,
          },
        });

      return this.toSummary(updated);
    });
  }

  private async validateOwner(
    input: CreateFinancialInstrumentInput
  ): Promise<void> {
    if (input.ownerType === "USER") {
      if (!input.userId || input.vendorId) {
        throw new Error(
          "A USER financial instrument requires userId only."
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!user || user.status !== "ACTIVE") {
        throw new Error("User is not active.");
      }

      return;
    }

    if (input.ownerType === "VENDOR") {
      if (!input.vendorId || input.userId) {
        throw new Error(
          "A VENDOR financial instrument requires vendorId only."
        );
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id: input.vendorId },
        select: {
          id: true,
          organizationId: true,
          status: true,
        },
      });

      if (!vendor) {
        throw new Error("Vendor not found.");
      }

      if (vendor.organizationId !== input.organizationId) {
        throw new Error(
          "Vendor does not belong to the organization."
        );
      }

      if (vendor.status === "SUSPENDED") {
        throw new Error("Vendor is suspended.");
      }

      return;
    }

    if (input.ownerType === "ORGANIZATION") {
      if (input.userId || input.vendorId) {
        throw new Error(
          "An ORGANIZATION financial instrument cannot have userId or vendorId."
        );
      }

      return;
    }

    throw new Error("Unsupported financial instrument owner.");
  }

  private validateCreateInput(
    input: CreateFinancialInstrumentInput
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error("Organization ID is required.");
    }

    if (!input.provider.trim()) {
      throw new Error("Financial provider is required.");
    }

    if (!input.providerRef.trim()) {
      throw new Error(
        "Provider financial instrument reference is required."
      );
    }

    const supportedTypes: FinancialInstrumentType[] = [
      "BANK_ACCOUNT",
      "CARD",
      "MOBILE_MONEY",
      "PSP_ACCOUNT",
      "OTHER",
    ];

    if (!supportedTypes.includes(input.type)) {
      throw new Error(
        "Unsupported financial instrument type."
      );
    }

    const supportedOwners: FinancialInstrumentOwnerType[] = [
      "USER",
      "VENDOR",
      "ORGANIZATION",
    ];

    if (!supportedOwners.includes(input.ownerType)) {
      throw new Error(
        "Unsupported financial instrument owner type."
      );
    }
  }

  private normalizeCurrency(currency?: string): string {
    const normalized = (currency || "AOA").trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new Error(
        "Currency must be a valid ISO 4217 three-letter code."
      );
    }

    return normalized;
  }

  private toJsonInput(
    value?: Record<string, unknown>
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private toSummary(
    instrument: {
      id: string;
      organizationId: string;
      userId: string | null;
      vendorId: string | null;
      type: FinancialInstrumentType;
      status: FinancialInstrumentStatus;
      ownerType: FinancialInstrumentOwnerType;
      provider: string;
      providerRef: string;
      displayName: string | null;
      maskedValue: string | null;
      currency: string;
      isDefault: boolean;
      verifiedAt: Date | null;
      expiresAt: Date | null;
      capabilities: unknown;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    }
  ): FinancialInstrumentSummary {
    return {
      id: instrument.id,
      organizationId: instrument.organizationId,
      ownerType: instrument.ownerType,
      userId: instrument.userId,
      vendorId: instrument.vendorId,
      type: instrument.type,
      status: instrument.status,
      provider: instrument.provider,
      providerRef: instrument.providerRef,
      displayName: instrument.displayName,
      maskedValue: instrument.maskedValue,
      currency: instrument.currency,
      isDefault: instrument.isDefault,
      verifiedAt: instrument.verifiedAt,
      expiresAt: instrument.expiresAt,
      capabilities: instrument.capabilities,
      metadata: instrument.metadata,
      createdAt: instrument.createdAt,
      updatedAt: instrument.updatedAt,
    };
  }
}
