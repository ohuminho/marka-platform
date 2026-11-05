"use client";

export type GrowthEventName =
  | "page_view"
  | "marketplace_view"
  | "product_view"
  | "store_view"
  | "search"
  | "add_to_cart";

type GrowthEventOptions = {
  entityId?: string;
  category?: string | null;
};

const CONSENT_KEY = "marka_growth_consent_v1";
const VISITOR_KEY = "marka_growth_visitor_v1";

export function trackGrowthEvent(event: GrowthEventName, options: GrowthEventOptions = {}): void {
  try {
    if (window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;

    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = window.crypto?.randomUUID?.() ?? null;
      if (!visitorId) return;
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }

    void fetch("/api/growth/events", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        consent: true,
        visitorId,
        path: window.location.pathname.slice(0, 300),
        ...(options.entityId ? { entityId: options.entityId } : {}),
        ...(options.category ? { category: options.category } : {}),
      }),
    }).catch(() => undefined);
  } catch {
    // Analytics must never block the customer journey.
  }
}
