import { prisma } from "@/database/client/prisma";

export interface UpdateStoreLocationInput {
  storeId: string;
  organizationId: string;
  actorUserId: string;
  latitude: number;
  longitude: number;
}

export class StoreLocationService {
  async updateLocation(input: UpdateStoreLocationInput) {
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
      throw new Error("INVALID_STORE_LATITUDE");
    }

    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
      throw new Error("INVALID_STORE_LONGITUDE");
    }

    const store = await prisma.store.findFirst({
      where: {
        id: input.storeId,
        vendor: {
          organizationId: input.organizationId,
        },
      },
      select: {
        id: true,
        vendorId: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!store) {
      throw new Error("STORE_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (database) => {
      const result = await database.store.update({
        where: {
          id: input.storeId,
        },
        data: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          vendorId: true,
          updatedAt: true,
        },
      });

      await database.domainEvent.create({
        data: {
          eventKey: `store.location.updated:${result.id}:${crypto.randomUUID()}`,
          aggregateType: "STORE",
          aggregateId: result.id,
          eventType: "store.location.updated",
          payload: {
            storeId: result.id,
            vendorId: result.vendorId,
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            previousLatitude: store.latitude?.toString() ?? null,
            previousLongitude: store.longitude?.toString() ?? null,
            latitude: input.latitude,
            longitude: input.longitude,
          },
          status: "PENDING",
        },
      });

      return result;
    });

    return updated;
  }
}

export const storeLocationService = new StoreLocationService();
