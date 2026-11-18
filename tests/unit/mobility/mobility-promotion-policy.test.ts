import assert from "node:assert/strict";

import { evaluateMobilityPromotion } from "../../../src/services/mobility/pricing/mobility-promotion-policy.service";

const common = {
  estimatedDistanceMeters: 12_000,
  longDistanceThresholdMeters: 10_000,
  isPeakHour: false,
  quotedFareMinor: BigInt(500_000),
  distanceFareMinor: BigInt(300_000),
  minimumPayableFareMinor: BigInt(100_000),
  availablePromotionBudgetMinor: BigInt(200_000),
};

const taxi = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
});

assert.equal(taxi.eligible, true);
assert.equal(taxi.discountMinor, BigInt(15_000)); // 5% da componente de distância
assert.equal(taxi.finalFareMinor, BigInt(485_000));

const motoTaxi = evaluateMobilityPromotion({
  ...common,
  vehicle: "MOTO_TAXI",
});

assert.equal(motoTaxi.discountMinor, BigInt(15_000));
assert.equal(motoTaxi.finalFareMinor, BigInt(485_000));

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
  distanceFareMinor: BigInt(300_000),
  isPeakHour: true,
});

assert.equal(peakHour.eligible, true);
assert.equal(peakHour.discountMinor, BigInt(50_000));

const budgetLimited = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  availablePromotionBudgetMinor: BigInt(10_000),
});

assert.equal(budgetLimited.eligible, false);
assert.equal(budgetLimited.reason, "BUDGET_INSUFFICIENT");
assert.equal(budgetLimited.discountMinor, BigInt(0));
assert.equal(budgetLimited.finalFareMinor, common.quotedFareMinor);

const minimumFareProtected = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  quotedFareMinor: BigInt(120_000),
  distanceFareMinor: BigInt(50_000),
  minimumPayableFareMinor: BigInt(118_000),
});

assert.equal(minimumFareProtected.eligible, false);
assert.equal(minimumFareProtected.reason, "MINIMUM_FARE_PROTECTED");
assert.equal(minimumFareProtected.discountMinor, BigInt(0));
assert.equal(minimumFareProtected.finalFareMinor, BigInt(120_000));

const disabled = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  enabled: false,
});

assert.equal(disabled.eligible, false);
assert.equal(disabled.discountMinor, BigInt(0));
assert.equal(disabled.finalFareMinor, common.quotedFareMinor);

const longDistanceTiers = [
  { distance: 12_000, rate: 500 },
  { distance: 20_000, rate: 800 },
  { distance: 30_000, rate: 1_200 },
  { distance: 45_000, rate: 1_500 },
];
for (const tier of longDistanceTiers) {
  const result = evaluateMobilityPromotion({
    ...common,
    vehicle: "TAXI",
    estimatedDistanceMeters: tier.distance,
    distanceFareMinor: BigInt(1_000_000),
  });
  assert.equal(result.discountRateBps, tier.rate);
}

console.log("Mobility promotion policy tests passed.");


import { MobilityPricingService } from "../../../src/services/mobility/pricing/mobility-pricing.service";

const integratedPricing = new MobilityPricingService().calculate({
  currency: "AOA",
  baseFareMinor: BigInt(500_000),
  estimatedDistanceMeters: 12_000,
  estimatedDurationSeconds: 1_800,
  distanceRateMinorPerKm: BigInt(4_167),
  durationRateMinorPerMinute: BigInt(0),
  promotion: {
    vehicle: "TAXI",
    longDistanceThresholdMeters: 10_000,
    isPeakHour: false,
    minimumPayableFareMinor: BigInt(100_000),
    availablePromotionBudgetMinor: BigInt(100_000),
  },
});

assert.equal(integratedPricing.promotion?.discountMinor, BigInt(2_500));
assert.equal(integratedPricing.totalMinor, BigInt(547_504));

console.log("Mobility pricing integration tests passed.");

const precisionPricing = new MobilityPricingService().calculate({
  currency: "AOA",
  baseFareMinor: BigInt(0),
  estimatedDistanceMeters: 1_000,
  estimatedDurationSeconds: 60,
  distanceRateMinorPerKm: BigInt("9007199254740993"),
  durationRateMinorPerMinute: BigInt("9007199254740993"),
});

assert.equal(
  precisionPricing.distanceFareMinor,
  BigInt("9007199254740993"),
);
assert.equal(
  precisionPricing.durationFareMinor,
  BigInt("9007199254740993"),
);
assert.equal(
  precisionPricing.totalMinor,
  BigInt("18014398509481986"),
);

const roundedPrecisionPricing = new MobilityPricingService().calculate({
  currency: "AOA",
  baseFareMinor: BigInt(0),
  estimatedDistanceMeters: 500,
  estimatedDurationSeconds: 30,
  distanceRateMinorPerKm: BigInt(101),
  durationRateMinorPerMinute: BigInt(101),
});

assert.equal(roundedPrecisionPricing.distanceFareMinor, BigInt(51));
assert.equal(roundedPrecisionPricing.durationFareMinor, BigInt(51));

assert.throws(
  () => new MobilityPricingService().calculate({
    currency: "AOA",
    baseFareMinor: BigInt(0),
    estimatedDistanceMeters: Number.MAX_SAFE_INTEGER + 1,
    estimatedDurationSeconds: 60,
    distanceRateMinorPerKm: BigInt(1),
    durationRateMinorPerMinute: BigInt(1),
  }),
  /Estimated distance must be a valid non-negative number/,
);

console.log("Mobility pricing precision tests passed.");

const distanceTierBoundaries = [
  { distance: 10_000, rate: 0 },
  { distance: 10_001, rate: 500 },
  { distance: 15_000, rate: 500 },
  { distance: 15_001, rate: 800 },
  { distance: 25_000, rate: 800 },
  { distance: 25_001, rate: 1_200 },
  { distance: 40_000, rate: 1_200 },
  { distance: 40_001, rate: 1_500 },
];
for (const boundary of distanceTierBoundaries) {
  const result = evaluateMobilityPromotion({
    ...common,
    vehicle: "TAXI",
    estimatedDistanceMeters: boundary.distance,
    distanceFareMinor: BigInt(1_000_000),
  });
  assert.equal(result.discountRateBps, boundary.rate, `Unexpected tier at ${boundary.distance}m`);
}

const taxiDiscountCap = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  estimatedDistanceMeters: 45_000,
  distanceFareMinor: BigInt(2_000_000),
});
assert.equal(taxiDiscountCap.discountMinor, BigInt(100_000)); // máximo 1.000 Kz

const motoTaxiDiscountCap = evaluateMobilityPromotion({
  ...common,
  vehicle: "MOTO_TAXI",
  estimatedDistanceMeters: 45_000,
  distanceFareMinor: BigInt(2_000_000),
});
assert.equal(motoTaxiDiscountCap.discountMinor, BigInt(50_000)); // máximo 500 Kz

const customThreshold = evaluateMobilityPromotion({
  ...common,
  vehicle: "TAXI",
  estimatedDistanceMeters: 15_000,
  longDistanceThresholdMeters: 20_000,
});
assert.equal(customThreshold.eligible, false);
assert.equal(customThreshold.discountMinor, BigInt(0));

console.log("Mobility promotion boundary and cap tests passed.");
