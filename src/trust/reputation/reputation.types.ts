export interface ReputationScore {
  entityId: string;
  entityType: "USER" | "VENDOR";
  score: number;
  level: string;
}
