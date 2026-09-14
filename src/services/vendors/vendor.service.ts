import { prisma } from "@/database/client/prisma";

export class VendorService {
  async createVendor(
    ownerId: string,
    storeName: string,
    organizationId?: string
  ) {
    let resolvedOrganizationId =
      organizationId;

    if (!resolvedOrganizationId) {
      const membership =
        await prisma.organizationMembership.findFirst({
          where: {
            userId: ownerId,
            status: "ACTIVE",
            organization: {
              status: "ACTIVE",
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
          select: {
            organizationId: true,
          },
        });

      if (!membership) {
        throw new Error(
          "Owner does not belong to an active organization."
        );
      }

      resolvedOrganizationId =
        membership.organizationId;
    }

    const organization =
      await prisma.organization.findUnique({
        where: {
          id: resolvedOrganizationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (
      !organization ||
      organization.status !== "ACTIVE"
    ) {
      throw new Error(
        "Organization is not active."
      );
    }

    const vendor =
      await prisma.vendor.create({
        data: {
          name: storeName.trim(),
          ownerId,
          organizationId:
            resolvedOrganizationId,
          store: {
            create: {
              name: storeName.trim(),
            },
          },
        },
        include: {
          store: true,
        },
      });

    return vendor;
  }
}
