export interface VendorManagement {
  vendorId: string;
  status: "ACTIVE" | "SUSPENDED" | "REVIEW";
  notes?: string;
}
