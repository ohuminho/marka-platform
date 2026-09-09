export interface Checkout {
  cartId: string;
  paymentMethod: string;
  status: "STARTED" | "PAID";
}
