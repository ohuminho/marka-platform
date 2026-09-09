export interface Verification {
  entityId: string;
  type: "IDENTITY" | "BUSINESS" | "DOCUMENT";
  verified: boolean;
}
