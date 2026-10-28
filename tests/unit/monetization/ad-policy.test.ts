import assert from "node:assert/strict";
import { canShowAdvertisement } from "../../../src/monetization/ads/ad-policy";
import type { MobilityAdContext } from "../../../src/monetization/ads/ad.types";

const base: MobilityAdContext = {
  adsEnabled: true,
  rideStatus: "TRIP_IN_PROGRESS",
  tripStartedAt: 1_000,
};

assert.equal(canShowAdvertisement("mobility_trip", base, 100_000), true);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, rideStatus: "DRIVER_ARRIVED" }, 100_000),
  false,
  "Mobility ads must not show before the trip is in progress."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, isNearDestination: true }, 100_000),
  false,
  "Mobility ads must be suppressed near the destination."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, isNavigationActive: true }, 100_000),
  false,
  "Mobility ads must not compete with active navigation."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, isPaymentFlowActive: true }, 100_000),
  false,
  "Mobility ads must be suppressed during payment."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, isSafetyFlowActive: true }, 100_000),
  false,
  "Mobility ads must be suppressed during safety actions."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, tripStartedAt: 99_000 }, 100_000),
  false,
  "Mobility ads must wait at least 90 seconds after trip start."
);
assert.equal(
  canShowAdvertisement("mobility_trip", { ...base, lastAdDismissedAt: 99_000 }, 100_000),
  false,
  "Mobility ads must respect the post-dismissal cooldown."
);
assert.equal(
  canShowAdvertisement("marketplace_feed", { adsEnabled: true }, 100_000),
  true
);
assert.equal(
  canShowAdvertisement("marketplace_feed", { adsEnabled: true, isCheckoutActive: true }, 100_000),
  false,
  "Marketplace ads must not show during checkout."
);
assert.equal(
  canShowAdvertisement("marketplace_feed", { adsEnabled: false }, 100_000),
  false,
  "Users must be able to disable ads."
);


assert.equal(
  canShowAdvertisement("marketplace_product", { adsEnabled: true }, 100_000),
  true,
  "Product placements should be eligible outside checkout."
);
assert.equal(
  canShowAdvertisement("community_feed", { adsEnabled: true }, 100_000),
  true,
  "Community-feed placements should be eligible outside checkout."
);
assert.equal(
  canShowAdvertisement("marketplace_product", { adsEnabled: true, isPaymentFlowActive: true }, 100_000),
  false,
  "Product placements must not show during payment."
);

console.log("MARKA ad policy tests passed.");
