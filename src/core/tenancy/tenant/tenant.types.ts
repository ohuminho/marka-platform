export interface Tenant {
  id: string;
  name: string;
  type: "PERSONAL" | "BUSINESS" | "ENTERPRISE";
  active: boolean;
}
