export type MobilitySettlementStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type MobilitySettlementResult = {
  id: string;

  organizationId: string;
  paymentId: string;
  rideId: string;
  driverId: string | null;

  currency: string;

  paymentMethod:
    | "CASH"
    | "DIGITAL";

  status:
    MobilitySettlementStatus;

  grossAmountMinor: string;
  commissionAmountMinor: string;
  driverNetAmountMinor: string;

  cashObligationAmountMinor: string;
  cashObligationSettledMinor: string;

  sourceReference: string | null;

  financialTransactionId:
    string | null;

  vendorPayableTransactionId:
    string | null;

  commissionTransactionId:
    string | null;

  cashObligationSettlementTransactionId:
    string | null;

  createdAt: Date;
  updatedAt: Date;

  processingStartedAt:
    Date | null;

  completedAt:
    Date | null;

  failedAt:
    Date | null;

  cancelledAt:
    Date | null;
};
