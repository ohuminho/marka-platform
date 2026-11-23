import assert from "node:assert/strict";

import { calculateSplit } from "../../../src/services/mobility/pricing/mobility-split.service";
import { validateFreightQuoteSplitSnapshot } from "../../../src/services/mobility/pricing/freight-quote-split-snapshot.service";

const amount = 12_500;
const split = calculateSplit(amount, "carga");
const details = {
  quoteSplitSnapshot: {
    version: 1,
    serviceType: "carga",
    currency: "AOA",
    totalKz: amount,
    commissionRate: split.commissionRate,
    platformFeeKz: split.platformFeeKz,
    providerAmountKz: split.providerAmountKz,
    policyKey: "MOBILITY_CARGO_STANDARD",
    policyVersion: 1,
  },
};

assert.deepEqual(validateFreightQuoteSplitSnapshot(details, amount), {
  version: 1,
  serviceType: "carga",
  currency: "AOA",
  totalKz: amount,
  commissionRate: 0.1,
  platformFeeKz: 1_250,
  providerAmountKz: 11_250,
  policyKey: "MOBILITY_CARGO_STANDARD",
  policyVersion: 1,
});

assert.equal(validateFreightQuoteSplitSnapshot(details, amount + 1), null);
assert.equal(validateFreightQuoteSplitSnapshot({
  quoteSplitSnapshot: { ...details.quoteSplitSnapshot, platformFeeKz: 1_249 },
}, amount), null);
assert.equal(validateFreightQuoteSplitSnapshot({
  quoteSplitSnapshot: { ...details.quoteSplitSnapshot, providerAmountKz: 11_251 },
}, amount), null);
assert.equal(validateFreightQuoteSplitSnapshot({
  quoteSplitSnapshot: { ...details.quoteSplitSnapshot, policyVersion: 2 },
}, amount), null);
assert.equal(validateFreightQuoteSplitSnapshot({}, amount), null);
assert.equal(validateFreightQuoteSplitSnapshot(null, amount), null);
assert.equal(validateFreightQuoteSplitSnapshot(details, 0), null);
assert.equal(validateFreightQuoteSplitSnapshot(details, 1.5), null);

console.log("Freight quote split snapshot validation tests passed.");
