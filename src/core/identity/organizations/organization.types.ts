export interface Organization {
  id: string;
  name: string;
  type: "BUSINESS" | "PARTNER" | "INTERNAL";
  createdAt: Date;
}
