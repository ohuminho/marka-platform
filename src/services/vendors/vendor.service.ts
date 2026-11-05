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
        // A company seller must never be attached to the shared MARKA platform
        // organization. Reuse only a BUSINESS organization the user belongs to;
        // otherwise create an isolated business workspace for this seller.
        const requestedMembership = input.organizationId
          ? await tx.organizationMembership.findFirst({
              where: {
                userId: ownerId,
                organizationId: input.organizationId,
                status: "ACTIVE",
                organization: { status: "ACTIVE", type: "BUSINESS" },
              },
              select: { organizationId: true },
            })
          : null;

        if (input.organizationId && !requestedMembership) {
          throw new Error("The selected business organization is not available to this account.");
        }

        if (requestedMembership) {
          organizationId = requestedMembership.organizationId;
        } else {
          const tenant = await tx.tenant.findUnique({
            where: { key: "marka" },
            select: { id: true },
          });
          if (!tenant) {
            throw new Error("MARKA tenant is not initialized.");
          }

          // Use a deterministic owner-scoped workspace instead of reusing
          // an arbitrary employer/third-party business membership.
          const businessOrganization = await tx.organization.upsert({
            where: { slug: `business-${ownerId}` },
            update: {
              name: input.storeName.trim(),
              tenantId: tenant.id,
              type: "BUSINESS",
            },
            create: {
              tenantId: tenant.id,
              name: input.storeName.trim(),
              slug: `business-${ownerId}`,
              type: "BUSINESS",
              status: "ACTIVE",
            },
            select: { id: true },
          });
          organizationId = businessOrganization.id;

          await tx.organizationMembership.upsert({
            where: {
              organizationId_userId: { organizationId, userId: ownerId },
            },
            update: { status: "ACTIVE" },
            create: { organizationId, userId: ownerId, status: "ACTIVE" },
          });
        }
      }

      return tx.vendor.create({
        data: {
          name: input.storeName.trim(),
          ownerId,
          organizationId,
          businessType: input.businessType,
          phone: input.phone?.trim() || null,
          country: input.country?.trim() || null,
          // Individual sellers can start listing ordinary, low-risk items immediately.
          // Verification remains visible and is required before sensitive categories.
          status: input.businessType === "INDIVIDUAL" ? "ACTIVE" : "PENDING",
          verified: false,
          store: {
            create: {
              name: input.storeName.trim(),
              status: input.businessType === "INDIVIDUAL" ? "ACTIVE" : "INACTIVE",
            },
          },
        },
        include: { store: true },
      });
    });
  }
}
