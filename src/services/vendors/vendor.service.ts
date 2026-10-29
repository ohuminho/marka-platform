import { prisma } from "@/database/client/prisma";

export class VendorService {
  async createVendor(
    ownerId: string,
    input: { storeName: string; businessType: "INDIVIDUAL" | "COMPANY"; phone?: string; country?: string; organizationId?: string }
  ) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: ownerId,
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      },
      orderBy: { joinedAt: "asc" },
      select: { organizationId: true },
    });

    if (!membership) {
      throw new Error("Owner must belong to an active organization.");
    }

    const existing = await prisma.vendor.findFirst({
      where: { ownerId, status: { notIn: ["SUSPENDED", "CLOSED"] } },
      select: { id: true },
    });
    if (existing) {
      throw new Error("A seller profile already exists for this account.");
    }

    return prisma.vendor.create({
      data: {
        name: input.storeName.trim(),
        ownerId,
        organizationId: membership.organizationId,
        businessType: input.businessType,
        phone: input.phone?.trim() || null,
        country: input.country?.trim() || null,
        status: "PENDING",
        verified: false,
        store: {
          create: {
            name: input.storeName.trim(),
            status: "INACTIVE",
          },
        },
      },
      include: { store: true },
    });
  }
}
