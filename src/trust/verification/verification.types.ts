export interface Verification {
  id: string;
  entityId: string;
  type: "USER" | "VENDOR" | "BUSINESS";
  verified: boolean;
  verifiedAt?: Date;
}
