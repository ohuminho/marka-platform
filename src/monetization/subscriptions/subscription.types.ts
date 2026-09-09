export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: "ACTIVE" | "CANCELLED";
}
