import { prisma } from "@/database/client/prisma";

export class VendorService {
  async createVendor(
    ownerId: string,
    storeName: string,
    organizationId?: string
  ) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: ownerId,
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
        ...(organizationId ? { organizationId } : {}),
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
        name: storeName.trim(),
        ownerId,
        organizationId: membership.organizationId,
        status: "PENDING",
        verified: false,
        store: {
          create: {
            name: storeName.trim(),
            status: "INACTIVE",
          },
        },
      },
      include: { store: true },
    });
  }
}
