import type { GeoPoint, LifecycleRecord, PolicyContext, PolicyPort } from "@/core/domain/contracts";

export type StoreAvailability = "OPEN" | "CLOSED" | "TEMPORARILY_UNAVAILABLE";

export interface StoreProfile extends LifecycleRecord {
  vendorId: string;
  name: string;
  description?: string;
  categoryIds: string[];
  availability: StoreAvailability;
  metadata: Record<string, unknown>;
}

export interface StoreOperatingHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  timezone: string;
}

export interface StoreLocation {
  storeId: string;
  address: string;
  countryCode: string;
  point?: GeoPoint;
}

export interface StoreDiscoveryQuery {
  organizationId: string;
  countryCode: string;
  categoryId?: string;
  point?: GeoPoint;
  radiusMeters?: number;
}

export interface StorePolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export type StorePolicyPort = PolicyPort<StoreProfile, StorePolicyDecision>;

export interface StoreDiscoveryPort {
  discover(
    query: StoreDiscoveryQuery,
    context: PolicyContext,
  ): Promise<StoreProfile[]>;
}
