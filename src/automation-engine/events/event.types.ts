export interface PlatformEvent {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  payload: Record<string, unknown>;
}

export const MARKA_GROWTH_EVENTS = [
  "GROWTH.PAGE_VIEW",
  "GROWTH.MARKETPLACE_VIEW",
  "GROWTH.PRODUCT_VIEW",
  "GROWTH.STORE_VIEW",
  "GROWTH.SEARCH",
  "GROWTH.ADD_TO_CART",
  "GROWTH.SIGN_UP",
  "GROWTH.PURCHASE",
] as const;

export type MarkaGrowthEvent = (typeof MARKA_GROWTH_EVENTS)[number];
