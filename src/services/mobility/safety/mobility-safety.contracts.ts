export type MobilityTripSafetyMode =
  | "STANDARD"
  | "TRUSTED"
  | "CHILD";

export type MobilitySafetyEligibilityStatus =
  | "PENDING"
  | "ELIGIBLE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "BLOCKED";

export type MobilitySafetyIncidentSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type MobilitySafetyIncidentStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED";

export interface MobilitySafetyContext {
  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EvaluateDriverSafetyInput
  extends MobilitySafetyContext {
  organizationId: string;
  driverId: string;
  vehicleId?: string;
  requireTrustedRide?: boolean;
  requireChildRide?: boolean;
}

export interface DriverSafetyEligibility {
  driverId: string;
  organizationId: string;
  status: MobilitySafetyEligibilityStatus;

  identityVerified: boolean;
  driverDocumentsVerified: boolean;
  vehicleVerified: boolean;

  eligibleForStandardRides: boolean;
  eligibleForTrustedRides: boolean;
  eligibleForChildRides: boolean;

  riskScore: number;
  completedTrips: number;
  incidentCount: number;
  highSeverityIncidentCount: number;

  reasons: string[];
  evaluatedAt: Date;
}

export interface CreateTrustedContactInput
  extends MobilitySafetyContext {
  userId: string;
  name: string;
  phone: string;
  relationship?: string;
}

export interface CreateTripSafetyInput
  extends MobilitySafetyContext {
  organizationId: string;
  rideId: string;
  riderId: string;
  mode: MobilityTripSafetyMode;
  childRide?: boolean;
  trustedRide?: boolean;
  pinRequired?: boolean;
  audioSafetyEnabled?: boolean;
}

export interface VerifyTripPinInput
  extends MobilitySafetyContext {
  rideId: string;
  pin: string;
}

export interface CreateTripShareInput
  extends MobilitySafetyContext {
  rideId: string;
  ownerUserId: string;
  recipientName: string;
  recipientPhone?: string;
  expiresAt?: Date;
}

export interface TripShareResult {
  id: string;
  rideId: string;
  recipientName: string;
  recipientPhone?: string;
  token: string;
  expiresAt: Date;
}

export interface ReportSafetyIncidentInput
  extends MobilitySafetyContext {
  organizationId: string;
  rideId?: string;
  driverId?: string;
  riderId?: string;
  reportedByUserId?: string;
  type: string;
  severity: MobilitySafetyIncidentSeverity;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface MobilitySafetyIncident {
  id: string;
  organizationId: string;
  rideId: string | null;
  driverId: string | null;
  riderId: string | null;
  type: string;
  severity: MobilitySafetyIncidentSeverity;
  status: MobilitySafetyIncidentStatus;
  description: string;
  createdAt: Date;
}

export interface MobilityTripSafetyRecord {
  id: string;
  rideId: string;
  riderId: string;
  driverId: string | null;
  mode: MobilityTripSafetyMode;
  childRide: boolean;
  trustedRide: boolean;
  pinRequired: boolean;
  pinVerified: boolean;
  pinVerifiedAt: Date | null;
  audioSafetyEnabled: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface StartAudioSafetyInput
  extends MobilitySafetyContext {
  rideId: string;
  startedByUserId?: string;
  provider?: string;
  providerReference?: string;
  retentionUntil?: Date;
}

export interface StopAudioSafetyInput
  extends MobilitySafetyContext {
  rideId: string;
}
