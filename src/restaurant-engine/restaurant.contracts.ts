import type { LifecycleRecord, Money, PolicyPort } from "@/core/domain/contracts";

export interface RestaurantProfile extends LifecycleRecord {
  storeId: string;
  name: string;
  cuisineCategories: string[];
  preparationTimeMinutes?: number;
  metadata: Record<string, unknown>;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface FoodProduct {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: Money;
  available: boolean;
  preparationStatus?: "AVAILABLE" | "PAUSED" | "SOLD_OUT";
}

export interface RestaurantOperatingHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  timezone: string;
}

export interface RestaurantAvailabilityDecision {
  available: boolean;
  reasons: string[];
}

export type RestaurantAvailabilityPolicy = PolicyPort<FoodProduct, RestaurantAvailabilityDecision>;
