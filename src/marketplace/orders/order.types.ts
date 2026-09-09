export interface Order {
  id: string;
  customerId: string;
  products: string[];
  total: number;
  status: "PENDING" | "PAID" | "DELIVERED";
}
