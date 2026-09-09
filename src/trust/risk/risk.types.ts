export interface RiskSignal {
  id: string;
  entityId: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}
