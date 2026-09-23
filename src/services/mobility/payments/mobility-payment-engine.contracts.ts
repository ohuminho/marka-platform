import type {
  MobilityPaymentMethod,
  MobilityPaymentStatus,
} from "@/services/mobility/payments/mobility-payment-engine.types";

export interface CreateMobilityPaymentInput {
  organizationId: string;
  rideId: string;
  riderId: string;
  driverId?: string;

  paymentMethod: MobilityPaymentMethod;

  currency: string;

  estimatedFareMinor: bigint;
  finalFareMinor?: bigint;

  commissionRateBps: number;

  pricingSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  idempotencyKey: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CompleteMobilityPaymentInput {
  organizationId: string;
  rideId: string;

  finalFareMinor: bigint;

  commissionRateBps: number;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  metadata?: Record<string, unknown>;
}

export interface MobilityPaymentResult {
  id: string;

  organizationId: string;
  rideId: string;
  riderId: string;
  driverId: string | null;

  currency: string;

  paymentMethod: MobilityPaymentMethod;
  status: MobilityPaymentStatus;

  estimatedFareMinor: string;
  finalFareMinor: string;

  commissionRateBps: number;
  commissionAmountMinor: string;

  driverGrossMinor: string;
  driverNetMinor: string;

  pricingSnapshot: unknown;
  metadata: unknown;

  authorizedAt: Date | null;
  collectedAt: Date | null;
  settledAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
