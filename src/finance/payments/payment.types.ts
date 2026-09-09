export interface Payment {
  id: string;
  payerId: string;
  amount: number;
  method: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
}
