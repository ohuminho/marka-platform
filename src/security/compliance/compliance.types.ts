export interface ComplianceRecord {
  id: string;
  requirement: string;
  status: "PENDING" | "COMPLIANT";
}
