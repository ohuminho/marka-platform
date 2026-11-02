import type { EntityRef, GeoPoint, LifecycleRecord, Money } from "@/core/domain/contracts";

export type FreightStatus =
  | "REQUESTED"
  | "QUOTED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "SEARCHING_CARRIER"
  | "ASSIGNED"
  | "PICKUP_IN_PROGRESS"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "DISPUTED"
  | "EXCEPTION";

export type FreightVehicleType =
  | "CARGO_TRICYCLE"
  | "PICKUP"
  | "CARGO_VAN"
  | "LIGHT_TRUCK"
  | "FLATBED_TRUCK"
  | "TIPPER_TRUCK"
  | "HEAVY_TRUCK"
  | "WATER_TANKER"
  | "SPECIALIZED";

export type FreightCapacityUnit = "KG" | "TON" | "M3" | "LITRE";

export interface CargoItem {
  description: string;
  category?: "GENERAL" | "AGRICULTURE" | "CONSTRUCTION" | "FURNITURE" | "WATER" | "OTHER";
  quantity: number;
  weightKg?: number;
  volumeM3?: number;
  handlingRequirements?: string[];
  photos?: string[];
}

export interface FreightShipment extends LifecycleRecord {
  requester: EntityRef;
  carrier?: EntityRef;
  vehicle?: FreightVehicleReference;
  origin: GeoPoint;
  destination: GeoPoint;
  cargo: CargoItem[];
  status: FreightStatus;
  quotedAmount?: Money;
  paidAt?: Date;
  pickupProof?: string[];
  deliveryProof?: string[];
  trackingReference?: string;
  customerNotes?: string;
}

export interface FreightVehicleReference {
  vehicleId: string;
  type: FreightVehicleType;
  capacity?: number;
  capacityUnit?: FreightCapacityUnit;
  cargoBody?: "OPEN" | "BOX" | "FLATBED" | "TIPPER" | "TANK";
  tankContent?: "POTABLE_WATER" | "NON_POTABLE_WATER" | "OTHER";
  dimensionsCm?: { length: number; width: number; height: number };
  serviceArea?: string[];
}

export type RoadsideAssistanceType =
  | "TOW"
  | "ACCIDENT_RECOVERY"
  | "BREAKDOWN_RECOVERY"
  | "TIRE_ASSISTANCE"
  | "BATTERY_ASSISTANCE"
  | "ON_SITE_MECHANIC";

export type RoadsideAssistanceStatus =
  | "REQUESTED"
  | "QUOTED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "SEARCHING_PROVIDER"
  | "ASSIGNED"
  | "PROVIDER_EN_ROUTE"
  | "PROVIDER_ARRIVED"
  | "VEHICLE_LOADED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "DISPUTED"
  | "EXCEPTION";

export interface RoadsideAssistanceRequest extends LifecycleRecord {
  requester: EntityRef;
  provider?: EntityRef;
  assistanceType: RoadsideAssistanceType;
  vehicleDescription: string;
  vehicleRegistration?: string;
  pickup: GeoPoint;
  destination?: GeoPoint;
  status: RoadsideAssistanceStatus;
  quotedAmount?: Money;
  paymentReference?: string;
  incidentDescription?: string;
  incidentPhotos?: string[];
  dispatchReference?: string;
  completionProof?: string[];
}
