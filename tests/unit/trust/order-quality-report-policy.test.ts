import { describe, expect, it } from "vitest";
import { isOrderQualityReportReason, orderQualityReportReasonLabel } from "@/core/trust/order-quality-report-policy";

describe("order quality report policy", () => {
  it("accepts only supported report reasons", () => {
    expect(isOrderQualityReportReason("ITEM_NOT_AS_DESCRIBED")).toBe(true);
    expect(isOrderQualityReportReason("DELIVERY_DISCREPANCY")).toBe(true);
    expect(isOrderQualityReportReason("UNKNOWN")).toBe(false);
    expect(isOrderQualityReportReason(null)).toBe(false);
  });

  it("provides a human-readable label for each supported reason", () => {
    expect(orderQualityReportReasonLabel("WRONG_OR_MISSING_ITEM")).toBe("Produto errado ou em falta");
  });
});
