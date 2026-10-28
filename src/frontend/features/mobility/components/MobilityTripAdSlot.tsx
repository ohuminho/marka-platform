"use client";

import { useEffect, useState } from "react";
import SponsoredAdCard from "@/frontend/features/ads/components/SponsoredAdCard";
import type { Advertisement, MobilityAdContext } from "@/monetization/ads/ad.types";
import { canShowAdvertisement } from "@/monetization/ads/ad-policy";

/**
 * Mount inside a real passenger trip screen and pass live ride/navigation state.
 * It intentionally renders nothing without an explicitly eligible active trip.
 */
export default function MobilityTripAdSlot({ context, audience = "rider", onDismiss }: { context: MobilityAdContext; audience?: "rider" | "driver"; onDismiss?: (dismissedAt: number) => void }) {
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!canShowAdvertisement("mobility_trip", context)) {
      setAdvertisement(null);
      return () => { cancelled = true; };
    }

    fetch("/api/ads?placement=mobility_trip", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data.advertisements) && data.advertisements.length
          ? data.advertisements[0] as Advertisement
          : null;
      })
      .then((item) => { if (!cancelled) setAdvertisement(item); })
      .catch(() => { if (!cancelled) setAdvertisement(null); });

    return () => { cancelled = true; };
  }, [
    context.adsEnabled,
    context.userDismissed,
    context.reducedMotion,
    context.rideStatus,
    context.tripStartedAt,
    context.isNearDestination,
    context.isNavigationActive,
    context.isPaymentFlowActive,
    context.isSafetyFlowActive,
    context.lastAdDismissedAt,
  ]);

  if (dismissed || !advertisement || !canShowAdvertisement("mobility_trip", context)) return null;

  return (
    <div className="mx-auto w-full max-w-xl" aria-label="Publicidade durante a viagem">
      <SponsoredAdCard
        advertisement={advertisement}
        placement="mobility_trip"
        context={context}
        audience={audience}
        onDismiss={(_advertisementId, dismissedAt) => { setDismissed(true); onDismiss?.(dismissedAt); }}
      />
    </div>
  );
}
