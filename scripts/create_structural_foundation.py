from pathlib import Path

ROOT = Path('/home/ubuntu/marka-platform')

FILES = {
    'src/core/domain/contracts.ts': '''export type IsoCurrencyCode = string & { readonly __brand: "IsoCurrencyCode" };

export interface EntityRef {
  id: string;
  type: string;
}

export interface LifecycleRecord {
  id: string;
  organizationId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Money {
  amountMinor: number;
  currency: IsoCurrencyCode;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DomainEventEnvelope<
  TType extends string = string,
  TPayload = unknown,
> {
  id: string;
  type: TType;
  aggregate: EntityRef;
  occurredAt: Date;
  actor?: EntityRef;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
  metadata: Record<string, unknown>;
}

export interface PolicyContext {
  actorId?: string;
  organizationId: string;
  countryCode: string;
  currency: IsoCurrencyCode;
  metadata: Record<string, unknown>;
}

export interface PolicyPort<TInput, TDecision> {
  evaluate(input: TInput, context: PolicyContext): Promise<TDecision>;
}

export interface LifecyclePort<TCommand, TResult> {
  execute(command: TCommand, context: PolicyContext): Promise<TResult>;
}
''',
    'src/commerce-engine/commerce.contracts.ts': '''import type {
  DomainEventEnvelope,
  EntityRef,
  LifecycleRecord,
  Money,
  PolicyContext,
  PolicyPort,
} from "@/core/domain/contracts";

export type CommerceStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED";

export interface CommercialEntity extends LifecycleRecord {
  type: string;
  owner: EntityRef;
  displayName: string;
  countryCode: string;
  metadata: Record<string, unknown>;
}

export interface CommerceOperation extends LifecycleRecord {
  entityId: string;
  buyer?: EntityRef;
  seller?: EntityRef;
  total?: Money;
  metadata: Record<string, unknown>;
}

export interface CommercePolicyDecision {
  allowed: boolean;
  reasons: string[];
  metadata: Record<string, unknown>;
}

export interface CommercePolicyPort
  extends PolicyPort<CommerceOperation, CommercePolicyDecision> {}

export type CommerceEvent = DomainEventEnvelope<
  | "commerce.entity.created"
  | "commerce.entity.updated"
  | "commerce.operation.created"
  | "commerce.operation.completed"
  | "commerce.operation.cancelled",
  CommerceOperation | CommercialEntity
>;
''',
    'src/store-engine/store.contracts.ts': '''import type { GeoPoint, LifecycleRecord, PolicyContext, PolicyPort } from "@/core/domain/contracts";

export type StoreAvailability = "OPEN" | "CLOSED" | "TEMPORARILY_UNAVAILABLE";

export interface StoreProfile extends LifecycleRecord {
  vendorId: string;
  name: string;
  description?: string;
  categoryIds: string[];
  availability: StoreAvailability;
  metadata: Record<string, unknown>;
}

export interface StoreOperatingHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  timezone: string;
}

export interface StoreLocation {
  storeId: string;
  address: string;
  countryCode: string;
  point?: GeoPoint;
}

export interface StoreDiscoveryQuery {
  organizationId: string;
  countryCode: string;
  categoryId?: string;
  point?: GeoPoint;
  radiusMeters?: number;
}

export interface StorePolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export interface StorePolicyPort
  extends PolicyPort<StoreProfile, StorePolicyDecision> {}

export interface StoreDiscoveryPort {
  discover(
    query: StoreDiscoveryQuery,
    context: PolicyContext,
  ): Promise<StoreProfile[]>;
}
''',
    'src/catalog-engine/catalog.contracts.ts': '''import type { LifecycleRecord, Money, PolicyContext, PolicyPort } from "@/core/domain/contracts";

export type CatalogProductStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";

export interface CatalogAttribute {
  key: string;
  value: string;
}

export interface CatalogVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: CatalogAttribute[];
  price: Money;
  inventoryReference?: string;
  status: CatalogProductStatus;
}

export interface CatalogProduct extends LifecycleRecord {
  storeId: string;
  name: string;
  description?: string;
  categoryIds: string[];
  attributes: CatalogAttribute[];
  variants: CatalogVariant[];
  mediaReferences: string[];
  status: CatalogProductStatus;
}

export interface CatalogAvailabilityQuery {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CatalogAvailabilityDecision {
  available: boolean;
  quantityAvailable?: number;
  reasons: string[];
}

export interface CatalogAvailabilityPolicy
  extends PolicyPort<CatalogAvailabilityQuery, CatalogAvailabilityDecision> {}
''',
    'src/restaurant-engine/restaurant.contracts.ts': '''import type { LifecycleRecord, Money, PolicyContext, PolicyPort } from "@/core/domain/contracts";

export interface RestaurantProfile extends LifecycleRecord {
  storeId: string;
  name: string;
  cuisineCategories: string[];
  preparationTimeMinutes?: number;
  metadata: Record<string, unknown>;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface FoodProduct {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: Money;
  available: boolean;
  preparationStatus?: "AVAILABLE" | "PAUSED" | "SOLD_OUT";
}

export interface RestaurantOperatingHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  timezone: string;
}

export interface RestaurantAvailabilityDecision {
  available: boolean;
  reasons: string[];
}

export interface RestaurantAvailabilityPolicy
  extends PolicyPort<FoodProduct, RestaurantAvailabilityDecision> {}
''',
    'src/order-engine/order.contracts.ts': '''import type { DomainEventEnvelope, EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

export type OrderLifecycleStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "FULFILLING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderLine {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

export interface OrderAggregate extends LifecycleRecord {
  buyer: EntityRef;
  seller?: EntityRef;
  lines: OrderLine[];
  subtotal: Money;
  fees: Money[];
  total: Money;
  status: OrderLifecycleStatus;
  idempotencyKey?: string;
}

export interface OrderCommand {
  orderId: string;
  reason?: string;
  metadata: Record<string, unknown>;
}

export type OrderEvent = DomainEventEnvelope<
  | "order.created"
  | "order.confirmed"
  | "order.processing"
  | "order.fulfillment.requested"
  | "order.completed"
  | "order.cancelled"
  | "order.refunded",
  OrderAggregate | OrderCommand
>;
''',
    'src/fulfillment-engine/fulfillment.contracts.ts': '''import type { DomainEventEnvelope, EntityRef, LifecycleRecord } from "@/core/domain/contracts";

export type FulfillmentStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "EXCEPTION"
  | "CANCELLED";

export interface FulfillmentRequest extends LifecycleRecord {
  orderId: string;
  pickup: EntityRef;
  destination: EntityRef;
  status: FulfillmentStatus;
  assignedAgentId?: string;
  exceptionCode?: string;
}

export interface FulfillmentAssignment {
  fulfillmentId: string;
  agentId: string;
  assignedAt: Date;
  acceptedAt?: Date;
}

export interface FulfillmentPort {
  request(input: Omit<FulfillmentRequest, keyof LifecycleRecord>, correlationId?: string): Promise<FulfillmentRequest>;
  assign(fulfillmentId: string, agentId: string): Promise<FulfillmentAssignment>;
  transition(fulfillmentId: string, status: FulfillmentStatus, reason?: string): Promise<FulfillmentRequest>;
}

export type FulfillmentEvent = DomainEventEnvelope<
  | "fulfillment.requested"
  | "fulfillment.assigned"
  | "fulfillment.preparation.started"
  | "fulfillment.picked_up"
  | "fulfillment.completed"
  | "fulfillment.exceptioned"
  | "fulfillment.cancelled",
  FulfillmentRequest | FulfillmentAssignment
>;
''',
    'src/dispatch-engine/dispatch.contracts.ts': '''import type { DomainEventEnvelope, EntityRef, GeoPoint, LifecycleRecord } from "@/core/domain/contracts";

export type DispatchStatus =
  | "CREATED"
  | "SEARCHING"
  | "OFFERED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REASSIGNING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export interface DispatchRequest extends LifecycleRecord {
  serviceType: "DELIVERY" | "MOBILITY" | "FREIGHT";
  subject: EntityRef;
  origin: GeoPoint;
  destination?: GeoPoint;
  status: DispatchStatus;
  candidatePolicyRef?: string;
}

export interface DispatchCandidate {
  agentId: string;
  score?: number;
  distanceMeters?: number;
  available: boolean;
  metadata: Record<string, unknown>;
}

export interface DispatchPort {
  discoverCandidates(request: DispatchRequest): Promise<DispatchCandidate[]>;
  assign(requestId: string, agentId: string): Promise<DispatchRequest>;
  accept(requestId: string, agentId: string): Promise<DispatchRequest>;
  reassign(requestId: string, reason: string): Promise<DispatchRequest>;
}

export type DispatchEvent = DomainEventEnvelope<
  | "dispatch.created"
  | "dispatch.candidates.discovered"
  | "dispatch.assigned"
  | "dispatch.accepted"
  | "dispatch.reassigned"
  | "dispatch.completed"
  | "dispatch.cancelled",
  DispatchRequest | DispatchCandidate
>;
''',
    'src/services/mobility/scheduled-transport/scheduled-transport.contracts.ts': '''import type { LifecycleRecord, Money, EntityRef } from "@/core/domain/contracts";

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
''',
    'src/freight-engine/freight.contracts.ts': '''import type { EntityRef, GeoPoint, LifecycleRecord, Money } from "@/core/domain/contracts";

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
''',
    'src/freight-engine/contracting/freight-contracting.contracts.ts': '''import type { LifecycleRecord, Money, EntityRef } from "@/core/domain/contracts";

export interface FreightOffer extends LifecycleRecord {
  shipmentId: string;
  carrier: EntityRef;
  amount: Money;
  validUntil: Date;
  terms: Record<string, unknown>;
}

export interface FreightRequestForQuotation extends LifecycleRecord {
  requester: EntityRef;
  shipmentId: string;
  responseDeadline: Date;
  requestedTerms: Record<string, unknown>;
}

export interface FreightContract extends LifecycleRecord {
  shipmentId: string;
  carrier: EntityRef;
  acceptedOfferId: string;
  terms: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED" | "COMPLETED" | "TERMINATED";
}
''',
    'src/vehicle-marketplace/vehicle-marketplace.contracts.ts': '''import type { EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

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
''',
    'src/equipment-marketplace/equipment-marketplace.contracts.ts': '''import type { EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

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
''',
    'docs/architecture/marka-structural-foundations.md': '''# MARKA structural foundations

This change set completes the structural foundation requested by the MARKA production-architecture brief without replacing the existing Next.js, Prisma or service architecture.

## Added contracts

The new contracts are intentionally policy-neutral and implementation-light. They define stable boundaries for:

- commerce operations and commercial entities;
- store profiles, operating hours, locations and discovery;
- catalog products, variants, attributes and availability;
- restaurants, menus, food products and preparation availability;
- order lifecycle and order events;
- fulfillment requests, assignment and transitions;
- reusable dispatch for delivery, mobility and freight;
- scheduled transport routes, schedules, journeys, bookings and tickets;
- freight shipments, cargo, vehicles and contracting;
- vehicle sales and rental listings;
- equipment listings and rental bookings.

## Ownership and non-goals

The existing Prisma models and service implementations remain untouched. These files do not invent pricing rules, matching algorithms, tax rules, settlement rules, compliance decisions or workflow policy. Those rules belong in implementations that consume the contracts after product requirements are approved.

Cross-domain concerns use the existing `src/core` ownership model through small, explicit abstractions for lifecycle records, money, policy context, policy ports and domain-event envelopes.
'''
}

for relative_path, content in FILES.items():
    target = ROOT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')

print(f'Created {len(FILES)} structural foundation files.')
