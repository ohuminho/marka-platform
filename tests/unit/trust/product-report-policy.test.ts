import assert from "node:assert/strict";
import { isProductReportReason, productReportReasonLabel, PRODUCT_REPORT_REASONS } from "../../../src/core/trust/product-report-policy";

assert.equal(PRODUCT_REPORT_REASONS.length, 6);
for (const reason of PRODUCT_REPORT_REASONS) {
  assert.equal(isProductReportReason(reason), true);
  assert.ok(productReportReasonLabel(reason).length > 0);
}
assert.equal(isProductReportReason("IMAGE_MISMATCH"), true);
assert.equal(isProductReportReason("DELETE_SELLER"), false);
assert.equal(isProductReportReason(""), false);
assert.equal(isProductReportReason(null), false);

console.log("MARKA product report policy tests passed.");
