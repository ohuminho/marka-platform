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
  | "PAYMENT_INITIALIZED"
  | "FINANCIAL_FINALIZED"
  | "CANCELLED"
  | "FAILED"
  | "RECOVERY_REQUIRED";

export type MobilitySafetyMode =
  | "STANDARD"
  | "TRUSTED"
  | "CHILD";

export type MobilityLifecycleAction =
  | "REQUEST"
  | "SAFETY_PRECHECK"
  | "SEARCH"
  | "DISPATCH"
  | "ACCEPT"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "START_TRIP"
  | "BEGIN_TRIP_PROGRESS"
  | "INITIALIZE_FINANCIALS"
  | "COMPLETE"
  | "CANCEL"
  | "RETRY_RECOVERY";

export type MobilityLifecycleFailureClass =
  | "BUSINESS"
  | "CONCURRENCY"
  | "VALIDATION"
  | "DEPENDENCY"
  | "TRANSIENT"
  | "UNKNOWN";
