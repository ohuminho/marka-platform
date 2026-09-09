export interface Escrow {
  id: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  released: boolean;
}
