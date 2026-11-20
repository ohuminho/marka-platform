import assert from "node:assert/strict";

import {
  calculateSplit,
  calculateSplitMinor,
  getMobilityCommissionRateBps,
  resolveMobilitySplitServiceType,
} from "../../../src/services/mobility/pricing/mobility-split.service";

const taxi = calculateSplit(10_000, "taxi");
assert.deepEqual(taxi, {
  totalKz: 10_000,
  commissionRate: 0.12,
  platformFeeKz: 1_200,
  providerAmountKz: 8_800,
});

const moto = calculateSplit(10_000, "moto");
assert.deepEqual(moto, {
  totalKz: 10_000,
  commissionRate: 0.1,
  platformFeeKz: 1_000,
  providerAmountKz: 9_000,
});

const cargo = calculateSplit(10_000, "carga");
assert.deepEqual(cargo, {
  totalKz: 10_000,
  commissionRate: 0.1,
  platformFeeKz: 1_000,
  providerAmountKz: 9_000,
});

// Odd values prove the rounding/remainder rule always closes exactly.
for (const serviceType of ["taxi", "moto", "carga"] as const) {
  for (const total of [0, 1, 5, 99, 101, 999, 10_001, 1_000_001]) {
    const result = calculateSplit(total, serviceType);
    assert.equal(result.platformFeeKz + result.providerAmountKz, total);
    assert.ok(Number.isSafeInteger(result.platformFeeKz));
    assert.ok(Number.isSafeInteger(result.providerAmountKz));
  }
}

assert.equal(calculateSplit(5, "taxi").platformFeeKz, 1); // 0.6 rounds up
assert.equal(calculateSplit(5, "moto").platformFeeKz, 1); // 0.5 rounds up
assert.deepEqual(calculateSplitMinor(9_007_199_254_740_993n, "taxi").providerAmountKz +
  calculateSplitMinor(9_007_199_254_740_993n, "taxi").platformFeeKz, 9_007_199_254_740_993n);

assert.equal(getMobilityCommissionRateBps("MOTO_TAXI"), 1_000);
assert.equal(resolveMobilitySplitServiceType("CARGO_SHIPMENT"), "carga");
assert.equal(resolveMobilitySplitServiceType("VAN"), "carga");
assert.throws(() => resolveMobilitySplitServiceType("UNKNOWN_SERVICE"), /Unsupported/);
assert.throws(() => calculateSplit(1.5, "taxi"), /safe integer/);
assert.throws(() => calculateSplit(-1, "taxi"), /safe integer/);

console.log("Mobility split calculation tests passed.");
