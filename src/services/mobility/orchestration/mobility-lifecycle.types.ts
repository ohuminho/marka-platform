export type MobilityOrchestrationStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RECOVERY_REQUIRED";

export type MobilityOrchestrationStep =
  | "REQUESTED"
  | "SAFETY_READY"
  | "SEARCHING"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "TRIP_IN_PROGRESS"
  | "TRIP_COMPLETED"
  | "PAY
