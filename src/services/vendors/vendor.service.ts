import { prisma } from "@/database/client/prisma";

export class VendorService {
  async createVendor(
    ownerId: string,
    input: { storeName: string; businessType: "INDIVIDUAL" | "COMPANY"; phone?: string; country?: string; organizationId?: string }
  ) {
    const existing = await prisma.vendor.findFirst({
      where: { ownerId },
      select: { id: true },
    });
    if (existing) {
      throw new Error("A seller profile already exists for this account.");
    }

    return prisma.$transaction(async (tx) => {
      let organizationId: string;

      if (input.businessType === "INDIVIDUAL") {
        // Every personal seller receives a private vendor workspace.
        // No pre-existing company or organization membership is required.
        const tenant = await tx.tenant.findUnique({
          where: { key: "marka" },
          select: { id: true },
        });
        if (!tenant) {
          throw new Error("MARKA tenant is not initialized.");
        }

        const personalOrganization = await tx.organization.upsert({
          where: { slug: `seller-${ownerId}` },
          update: {
            name: input.storeName.trim(),
            tenantId: tenant.id,
            type: "VENDOR",
          },
          create: {
            tenantId: tenant.id,
            name: input.storeName.trim(),
            slug: `seller-${ownerId}`,
            type: "VENDOR",
            status: "ACTIVE",
          },
          select: { id: true },
        });
        organizationId = personalOrganization.id;

        await tx.organizationMembership.upsert({
          where: {
            organizationId_userId: { organizationId, userId: ownerId },
          },
          update: { status: "ACTIVE" },
          create: { organizationId, userId: ownerId, status: "ACTIVE" },
        });
      } else {
        // Company sellers must be attached to an existing, active organization.
        const membership = await tx.organizationMembership.findFirst({
          where: {
            userId: ownerId,
            status: "ACTIVE",
            organization: {
              status: "ACTIVE",
              ...(input.organizationId ? { id: input.organizationId } : {}),
            },
          },
          orderBy: { joinedAt: "asc" },
          select: { organizationId: true },
        });

        if (!membership) {
          throw new Error("Company sellers must belong to an active organization.");
        }
        organizationId = membership.organizationId;
      }

      return tx.vendor.create({
        data: {
          name: input.storeName.trim(),
          ownerId,
          organizationId,
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
    });
  }
}
