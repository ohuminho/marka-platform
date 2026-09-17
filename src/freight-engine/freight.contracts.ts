import type { EntityRef, GeoPoint, LifecycleRecord, Money } from "@/core/domain/contracts";

export type FreightStatus =
  | "REQUESTED"
  | "QUOTED"
  | "CONTRACTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "EXCEPTION";

export interface CargoItem {
  description: string;
  quantity: number;
  weightKg?: number;
  volumeM3?: number;
  handlingRequirements?: string[];
}

export interface FreightShipment extends LifecycleRecord {
  requester: EntityRef;
  carrier?: EntityRef;
  origin: GeoPoint;
  destination: GeoPoint;
  cargo: CargoItem[];
  status: FreightStatus;
  quotedAmount?: Money;
  trackingReference?: string;
}

export interface FreightVehicleReference {
  vehicleId: string;
  type: "TRUCK" | "TIPPER_TRUCK" | "TANKER" | "CARGO_VEHICLE" | "SPECIALIZED";
  capacity?: number;
}
