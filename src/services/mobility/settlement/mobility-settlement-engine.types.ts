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

  /**
   * Authoritative MARKA Financial Core
   * transaction representing the external
   * digital payment capture.
   */
  financialTransactionId:
    string | null;

  /**
   * Financial Core transaction that credits
   * the driver's payable account.
   */
  vendorPayableTransactionId:
    string | null;

  /**
   * Financial Core transaction recognizing
   * the current Mobility commission.
   */
  commissionTransactionId:
    string | null;

  /**
   * Financial Core transaction recognizing
   * previously-created cash obligations
   * settled from current digital proceeds.
   */
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
