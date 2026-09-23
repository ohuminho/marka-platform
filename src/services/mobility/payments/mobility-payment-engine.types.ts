export type MobilityPaymentMethod =
  | "CASH"
  | "DIGITAL";

export type MobilityPaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "COLLECTED"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";
