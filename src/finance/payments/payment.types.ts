export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: "PENDING" | "PAID" | "FAILED";
}
