export interface Incident {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  resolved: boolean;
}
