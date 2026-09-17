import type {
  StoreAvailability,
  StoreDiscoveryQuery,
  StoreProfile,
} from "@/store-engine/store.contracts";
import type { PolicyContext } from "@/core/domain/contracts";
import { prisma } from "@/database/client/prisma";

export class StoreAdapter {
  async getStore(
    storeId: string,
    context: PolicyContext,
  ): Promise<StoreProfile | null> {
    if (!storeId.trim()) {
      throw new Error("Store is required.");
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return null;
    }

    return this.toProfile(store, context.organizationId);
  }

  async discover(
    query: StoreDiscoveryQuery,
    context: PolicyContext,
  ): Promise<StoreProfile[]> {
    if (query.organizationId !== context.organizationId) {
      throw new Error(
        "Store discovery organization does not match the policy context.",
      );
    }

    const stores = await prisma.store.findMany({
      where: {
        status: {
          in: ["ACTIVE"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return stores.map((store) =>
      this.toProfile(store, context.organizationId),
    );
  }

  private toProfile(
    store: {
      id: string;
      name: string;
      description: string | null;
      vendorId: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationId: string,
  ): StoreProfile {
    const availability: StoreAvailability =
      store.status === "ACTIVE" ? "OPEN" : "CLOSED";

    return {
      id: store.id,
      organizationId,
      status: store.status,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      vendorId: store.vendorId,
      name: store.name,
      description: store.description ?? undefined,
      categoryIds: [],
      availability,
      metadata: {},
    };
  }
}

export const storeAdapter = new StoreAdapter();
