import type { AdvertisementPlacement, MobilityAdContext } from "./ad.types";

/**
 * Central UX guard for MARKA advertising.
 *
 * The policy intentionally suppresses ads during critical mobility actions.
 * It is a client-side presentation guard, not an authorization or billing control.
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
    if (context.lastAdDismissedAt && now - context.lastAdDismissedAt < 5 * 60_000) {
      return false;
    }
    if (context.tripStartedAt && now - context.tripStartedAt < 90_000) {
      return false;
    }
    return true;
  }

  if (placement === "marketplace_feed") {
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
