import assert from "node:assert/strict";
import {
  isOrderQualityReportReason,
  orderQualityReportReasonLabel,
} from "../../../src/core/trust/order-quality-report-policy";

assert.equal(isOrderQualityReportReason("ITEM_NOT_AS_DESCRIBED"), true);
assert.equal(isOrderQualityReportReason("DELIVERY_DISCREPANCY"), true);
assert.equal(isOrderQualityReportReason("UNKNOWN"), false);
assert.equal(isOrderQualityReportReason(null), false);
assert.equal(
  orderQualityReportReasonLabel("WRONG_OR_MISSING_ITEM"),
  "Produto errado ou em falta",
);

console.log("MARKA order quality report policy tests passed.");
