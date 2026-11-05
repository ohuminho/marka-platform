"use client";

import { useEffect } from "react";

type Props = {
  event: "product_view" | "store_view";
  entityId: string;
  category?: string | null;
};

const CONSENT_KEY = "marka_growth_consent_v1";
const VISITOR_KEY = "marka_growth_visitor_v1";

export default function GrowthEntityEvent({ event, entityId, category }: Props) {
  useEffect(() => {
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
          entityId,
          ...(category ? { category } : {}),
        }),
      }).catch(() => undefined);
    } catch {
      // Analytics must never block a public product or store page.
    }
  }, [event, entityId, category]);

  return null;
}
