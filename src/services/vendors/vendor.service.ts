import { prisma } from "@/database/client/prisma";

export class VendorService {
  async createVendor(
    ownerId: string,
    storeName: string
  ) {
    return prisma.vendor.create({
      data: {
        name: storeName,
        ownerId,
        store: {
          create: {
            name: storeName,
          },
        },
      },
      include: {
        store: true,
      },
    });
  }
}
