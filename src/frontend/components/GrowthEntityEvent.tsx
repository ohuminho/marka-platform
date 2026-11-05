"use client";

import { useEffect } from "react";
import { trackGrowthEvent } from "@/frontend/features/growth/track-growth-event";

type Props = {
  event: "product_view" | "store_view";
  entityId: string;
  category?: string | null;
};

export default function GrowthEntityEvent({ event, entityId, category }: Props) {
  useEffect(() => {
    trackGrowthEvent(event, { entityId, category });
  }, [event, entityId, category]);

  return null;
}
