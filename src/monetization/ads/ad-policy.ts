import type { AdvertisementPlacement, MobilityAdContext } from "./ad.types";

/**
 * Central UX guard for MARKA advertising.
 * Suppresses ads during critical mobility actions and checkout/payment flows.
 * This is a client-side presentation guard, not an authorization or billing control.
 */
export function canShowAdvertisement(
  placement: AdvertisementPlacement,
  context: MobilityAdContext,
  now: number = Date.now()
): boolean {
  if (!context.adsEnabled || context.userDismissed || context.reducedMotion) {
    return false;
  }

  if (placement === "mobility_trip") {
    if (context.rideStatus !== "TRIP_IN_PROGRESS") return false;
    if (context.isNearDestination || context.isNavigationActive) return false;
    if (context.isPaymentFlowActive || context.isSafetyFlowActive) return false;
    if (
      context.lastAdDismissedAt != null &&
      now - context.lastAdDismissedAt < AD_UX_LIMITS.mobilityMinimumSecondsBetweenAds * 1000
    ) {
      return false;
    }
    if (context.tripStartedAt != null && now - context.tripStartedAt < 90_000) {
      return false;
    }
    return true;
  }

  // Marketplace discovery/product placements are permitted, but never during checkout or payment.
  if (
    placement === "marketplace_feed" ||
    placement === "marketplace_product" ||
    placement === "community_feed"
  ) {
    return !context.isCheckoutActive && !context.isPaymentFlowActive;
  }

  return false;
}

/** Maximum client-side creative duration; campaigns can choose a shorter limit. */
export const AD_UX_LIMITS = {
  mobilityVideoMaxSeconds: 15,
  mobilityMinimumSecondsBetweenAds: 5 * 60,
  marketplaceVideoMaxSeconds: 20,
  maxAdsPerSession: 3,
} as const;
