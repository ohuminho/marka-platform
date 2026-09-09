export interface Reputation {
  id: string;
  entityId: string;
  score: number;
  reviews: number;
  level: "NEW" | "TRUSTED" | "PREMIUM";
}
