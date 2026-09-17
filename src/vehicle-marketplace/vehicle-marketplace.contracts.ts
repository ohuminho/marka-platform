import type { EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

export type VehicleListingType = "SALE" | "RENTAL";

export interface VehicleSpecification {
  make?: string;
  model?: string;
  year?: number;
  type: "CAR" | "MOTORCYCLE" | "VAN" | "BUS" | "TRUCK" | "SPECIALIZED";
  countryCode?: string;
  metadata: Record<string, unknown>;
}

export interface VehicleListing extends LifecycleRecord {
  seller: EntityRef;
  type: VehicleListingType;
  specification: VehicleSpecification;
  price?: Money;
  available: boolean;
  inspectionReference?: string;
  mediaReferences: string[];
}

export interface VehicleRentalBooking extends LifecycleRecord {
  listingId: string;
  renter: EntityRef;
  startsAt: Date;
  endsAt: Date;
  price: Money;
  status: "HELD" | "CONFIRMED" | "ACTIVE" | "RETURNED" | "CANCELLED";
}
