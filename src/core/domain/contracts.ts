export type IsoCurrencyCode = string & { readonly __brand: "IsoCurrencyCode" };

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
