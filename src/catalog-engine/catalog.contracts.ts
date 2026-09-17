import type { LifecycleRecord, Money, PolicyPort } from "@/core/domain/contracts";

export type CatalogProductStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";

export interface CatalogAttribute {
  key: string;
  value: string;
}

export interface CatalogVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: CatalogAttribute[];
  price: Money;
  inventoryReference?: string;
  status: CatalogProductStatus;
}

export interface CatalogProduct extends LifecycleRecord {
  storeId: string;
  name: string;
  description?: string;
  categoryIds: string[];
  attributes: CatalogAttribute[];
  variants: CatalogVariant[];
  mediaReferences: string[];
  status: CatalogProductStatus;
}

export interface CatalogAvailabilityQuery {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CatalogAvailabilityDecision {
  available: boolean;
  quantityAvailable?: number;
  reasons: string[];
}

export type CatalogAvailabilityPolicy = PolicyPort<CatalogAvailabilityQuery, CatalogAvailabilityDecision>;
