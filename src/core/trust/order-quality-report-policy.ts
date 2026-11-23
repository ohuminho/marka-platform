export const ORDER_QUALITY_REPORT_REASONS = [
  "ITEM_NOT_AS_DESCRIBED",
  "WRONG_OR_MISSING_ITEM",
  "DAMAGED_OR_DEFECTIVE",
  "QUANTITY_MISMATCH",
  "DELIVERY_DISCREPANCY",
  "OTHER",
] as const;

export type OrderQualityReportReason = (typeof ORDER_QUALITY_REPORT_REASONS)[number];

export function isOrderQualityReportReason(value: unknown): value is OrderQualityReportReason {
  return typeof value === "string" && ORDER_QUALITY_REPORT_REASONS.some((reason) => reason === value);
}

export function orderQualityReportReasonLabel(reason: OrderQualityReportReason): string {
  const labels: Record<OrderQualityReportReason, string> = {
    ITEM_NOT_AS_DESCRIBED: "Produto diferente da descrição",
    WRONG_OR_MISSING_ITEM: "Produto errado ou em falta",
    DAMAGED_OR_DEFECTIVE: "Produto danificado ou defeituoso",
    QUANTITY_MISMATCH: "Quantidade incorrecta",
    DELIVERY_DISCREPANCY: "Problema com a entrega",
    OTHER: "Outro problema",
  };
  return labels[reason];
}
