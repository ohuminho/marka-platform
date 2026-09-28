export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  userId: string;
  cartId: string;
  items: OrderItemInput[];
  total: number;
}

export interface OrderSummary {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
}
