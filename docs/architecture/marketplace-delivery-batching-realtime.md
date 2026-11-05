# MARKA Marketplace Delivery: Simple Dispatch, Tracking and Notifications

Status: Current product decision
Updated: 2026-11-04
Scope: Marketplace fulfillment and delivery dispatch

## Product decisions

1. Keep the customer checkout and fulfillment boundaries already implemented. Each seller fulfillment has its own delivery request, status, assignment and proof of delivery.
2. A nearby eligible courier may accept a delivery even when already handling another delivery. The courier does not need to finish the first delivery before accepting a second nearby request.
3. Do not require delivery batching, route clustering, multi-pickup optimization or a consolidated delivery journey for the initial product. Each accepted delivery follows its own independent lifecycle.
4. A courier may accept requests sequentially as they appear nearby. Matching must consider both AVAILABLE and BUSY couriers, subject to ACTIVE status, valid recent location, service area and applicable verification/vehicle requirements.
5. Acceptance of each individual request must be atomic: only one courier can win a given request. Accepting a second request must not overwrite or detach the first assignment.
6. A courier returns to AVAILABLE only when no other active accepted delivery remains. Completing, cancelling, expiring or reassigning one request must not make the courier available while another accepted delivery is still active.
7. Seller-owned delivery remains supported. Seller delivery and MARKA-dispatched fulfillment must not corrupt the parent order or other fulfillment states.
8. Preserve existing financial boundaries: do not hold seller funds in MARKA wallets; payment settlement and platform revenue remain governed by the financial architecture and auditable ledger.

## Dispatch lifecycle and courier availability

- Create one dispatch request per fulfillment/delivery leg.
- Discover nearby ACTIVE couriers with a valid, recent location. BUSY is not an exclusion: a courier with active work can receive and accept another suitable request.
- On acceptance, use a database transaction and conditional update so concurrent couriers cannot claim the same dispatch request.
- Mark the courier BUSY after acceptance. BUSY means the courier has active work; it does not mean unavailable for additional nearby offers.
- On completion, cancellation, expiry or reassignment, count the courier's other active accepted delivery requests, excluding the request being closed or reassigned. Set AVAILABLE only when that count is zero.
- Keep each delivery's pickup, handover, cancellation and completion states independent. Do not introduce mandatory batching or route planning into this flow.
- If no eligible courier is found, keep the request in a retryable/searching state and show an honest status. Never fabricate an assignment or tracking position.

## Location and customer tracking

- Use location only for dispatch and active delivery tracking, with explicit permission and clear purpose.
- Require a recent location timestamp for proximity matching; stale coordinates must not be treated as live.
- Customer tracking must be scoped to the customer's own order/fulfillment and its assigned courier.
- Show last update time and stale-location state. Never fabricate movement or claim live tracking when updates have stopped.
- Use OpenStreetMap-compatible mapping and an open routing engine behind an abstraction. Public free endpoints are not a production SLA; self-hosting still has compute and operational costs.

## Notifications

- In-app state and durable application records remain the source of truth.
- Web Push (VAPID) can provide a zero-licence-cost browser/PWA baseline, subject to browser policies and hosting/operations costs.
- Push subscriptions, expiry, revocation, retries, deduplication and user preferences must be implemented before claiming background push is production-ready.
- Do not claim push notifications are active merely because realtime events exist.

## Verified implementation facts to preserve

- Prisma has DeliveryAgent with transport mode, availability and last-known latitude/longitude.
- DispatchRequest represents one subject/delivery request and one accepted agent.
- DispatchAdapter.accept() permits ACTIVE delivery agents whose availability is AVAILABLE or BUSY, and uses a transaction plus conditional dispatch update to prevent two couriers accepting the same request.
- Delivery matching considers BUSY and AVAILABLE agents, subject to active status, recent location and proximity.
- DispatchAdapter.complete(), cancel(), expire() and reassign() count other ACCEPTED delivery requests while excluding the request being closed/reassigned. Do not reintroduce a BUSY lockout or count the current request as another active delivery.
- Fulfillment completion has its own lifecycle. Keep dispatch and fulfillment states consistent.
- The current schema does not implement multi-request batches or consolidated multi-seller routing. That is intentional for the current product scope, not a reason to block sequential acceptance.

## Deferred enhancements (not required to launch the simple flow)

- Optional route suggestions for couriers handling several nearby deliveries, without preventing independent acceptance.
- Optional multi-pickup batch offers only after operational evidence justifies the complexity and only with explicit per-fulfillment accounting and lifecycle.
- Durable Web Push inbox/subscriptions and authenticated realtime tracking.
- Advanced ETA, route optimization, proof-of-delivery and offline synchronization.

## Acceptance scenarios

- A courier with no active delivery can accept a nearby request and becomes BUSY.
- The same courier, while BUSY with the first request, can accept a second eligible nearby request.
- Two couriers attempting the same request concurrently: exactly one acceptance succeeds.
- Completing one of two active requests leaves the courier BUSY.
- Cancelling, expiring or reassigning one of two active requests leaves the courier BUSY.
- Completing/cancelling/expiring/reassigning the final active request returns the courier to AVAILABLE.
- A stale or missing courier location excludes that courier from proximity offers.
- A customer cannot access another customer's delivery location or tracking channel.
