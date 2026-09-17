import type { EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

export interface EquipmentSpecification {
  category: "HEAVY" | "CONSTRUCTION" | "INDUSTRIAL" | "AGRICULTURAL" | "SPECIALIZED";
  make?: string;
  model?: string;
  year?: number;
  capacity?: string;
  metadata: Record<string, unknown>;
}

export interface EquipmentListing extends LifecycleRecord {
  owner: EntityRef;
  specification: EquipmentSpecification;
  available: boolean;
  salePrice?: Money;
  rentalPrice?: Money;
  mediaReferences: string[];
}

export interface EquipmentRentalBooking extends LifecycleRecord {
  listingId: string;
  renter: EntityRef;
  startsAt: Date;
  endsAt: Date;
  price: Money;
  status: "HELD" | "CONFIRMED" | "ACTIVE" | "RETURNED" | "CANCELLED";
}
