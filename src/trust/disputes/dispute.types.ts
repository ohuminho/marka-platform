export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  status: "OPEN" | "REVIEW" | "RESOLVED";
}
