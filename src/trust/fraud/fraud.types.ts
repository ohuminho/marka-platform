export interface FraudSignal {
  id: string;
  entityId: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
}
