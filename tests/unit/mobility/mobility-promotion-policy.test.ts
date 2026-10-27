import assert from "node:assert/strict";

import { evaluateMobilityPromotion } from "../../../src/services/mobility/pricing/mobility-promotion-policy.service";

const common = {
  estimatedDistanceMeters: 12_000,
  longDistanceThresholdMeters: 10_000,
  isPeakHour: false,
  quotedFareMinor: BigInt(500_000),
  minimumPayableFareMinor: BigInt(100_000),
  availablePromotionBudgetMinor: BigInt(200_000),
};

const taxi = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
});

assert.equal(taxi.eligible, true);
assert.equal(taxi.discountMinor, BigInt(100_000)); // 1,000 Kz
assert.equal(taxi.finalFareMinor, BigInt(400_000));

const motoTaxi = evaluateMobilityPromotion({
  ...common,
  vehicle: "MOTO_TAXI",
});

assert.equal(motoTaxi.discountMinor, BigInt(50_000)); // 500 Kz
assert.equal(motoTaxi.finalFareMinor, BigInt(450_000));

const shortOffPeak = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  estimatedDistanceMeters: 2_000,
  isPeakHour: false,
});

assert.equal(shortOffPeak.eligible, false);
assert.equal(shortOffPeak.discountMinor, BigInt(0));
assert.equal(shortOffPeak.finalFareMinor, common.quotedFareMinor);

const peakHour = evaluateMobilityPromotion({
  ...common,
  vehicle: "MOTO_TAXI",
  estimatedDistanceMeters: 2_000,
  isPeakHour: true,
});

assert.equal(peakHour.eligible, true);
assert.equal(peakHour.discountMinor, BigInt(50_000));

const budgetLimited = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  availablePromotionBudgetMinor: BigInt(20_000),
});

assert.equal(budgetLimited.discountMinor, BigInt(20_000));
assert.equal(budgetLimited.finalFareMinor, BigInt(480_000));

const minimumFareProtected = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  quotedFareMinor: BigInt(120_000),
  minimumPayableFareMinor: BigInt(110_000),
});

assert.equal(minimumFareProtected.discountMinor, BigInt(10_000));
assert.equal(minimumFareProtected.finalFareMinor, BigInt(110_000));

const disabled = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  enabled: false,
});

assert.equal(disabled.eligible, false);
assert.equal(disabled.discountMinor, BigInt(0));
assert.equal(disabled.finalFareMinor, common.quotedFareMinor);

console.log("Mobility promotion policy tests passed.");


import { MobilityPricingService } from "../../../src/services/mobility/pricing/mobility-pricing.service";

const integratedPricing = new MobilityPricingService().calculate({
  currency: "AOA",
  baseFareMinor: BigInt(500_000),
  estimatedDistanceMeters: 12_000,
  estimatedDurationSeconds: 1_800,
  distanceRateMinorPerKm: BigInt(0),
  durationRateMinorPerMinute: BigInt(0),
  promotion: {
    vehicle: "TAXI",
    longDistanceThresholdMeters: 10_000,
    isPeakHour: false,
    minimumPayableFareMinor: BigInt(100_000),
    availablePromotionBudgetMinor: BigInt(100_000),
  },
});

assert.equal(integratedPricing.promotion?.discountMinor, BigInt(100_000));
assert.equal(integratedPricing.totalMinor, BigInt(400_000));

console.log("Mobility pricing integration tests passed.");
