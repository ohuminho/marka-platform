import type { LifecycleRecord, Money, EntityRef } from "@/core/domain/contracts";

export interface TransportRoute extends LifecycleRecord {
  name: string;
  origin: EntityRef;
  destination: EntityRef;
  stops: EntityRef[];
}

export interface TransportSchedule extends LifecycleRecord {
  routeId: string;
  departureAt: Date;
  arrivalAt?: Date;
  timezone: string;
  capacity: number;
}

export interface TransportJourney extends LifecycleRecord {
  scheduleId: string;
  vehicleId?: string;
  status: "SCHEDULED" | "BOARDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface PassengerBooking extends LifecycleRecord {
  journeyId: string;
  passengerId: string;
  seatReference?: string;
  fare?: Money;
  status: "HELD" | "CONFIRMED" | "CANCELLED" | "USED";
}

export interface TransportTicket extends LifecycleRecord {
  bookingId: string;
  code: string;
  issuedAt: Date;
  usedAt?: Date;
}
