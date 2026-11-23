export const PRODUCT_REPORT_REASONS = [
  "MISLEADING_DESCRIPTION",
  "IMAGE_MISMATCH",
  "WRONG_CATEGORY",
  "PROHIBITED_OR_ILLEGAL",
  "SUSPECTED_COUNTERFEIT",
  "OTHER",
] as const;

export type ProductReportReason = (typeof PRODUCT_REPORT_REASONS)[number];

export function isProductReportReason(value: unknown): value is ProductReportReason {
  return typeof value === "string" && PRODUCT_REPORT_REASONS.some((reason) => reason === value);
}

export function productReportReasonLabel(reason: ProductReportReason): string {
  const labels: Record<ProductReportReason, string> = {
    MISLEADING_DESCRIPTION: "Descrição enganosa",
    IMAGE_MISMATCH: "Fotografia não corresponde ao produto",
    WRONG_CATEGORY: "Categoria incorrecta",
    PROHIBITED_OR_ILLEGAL: "Produto proibido ou ilegal",
    SUSPECTED_COUNTERFEIT: "Suspeita de contrafacção",
    OTHER: "Outro motivo",
  };
  return labels[reason];
}
