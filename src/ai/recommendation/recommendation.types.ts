export interface Recommendation {
  id: string;
  userId: string;
  entityId: string;
  reason: string;
  score: number;
}
