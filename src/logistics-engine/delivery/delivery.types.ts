export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string;
  status:
    | "CREATED"
    | "PICKUP"
    | "IN_TRANSIT"
    | "DELIVERED";
}
