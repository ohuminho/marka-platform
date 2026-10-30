# MARKA Marketplace Delivery Batching, Notifications and Live Tracking

Status: Accepted architecture decision
Date: 2026-10-30
Scope: Marketplace, Fulfillment, Dispatch, Mobility and customer order tracking

## Product decisions

1. A customer checkout spanning multiple sellers remains one customer-facing purchase, but is fulfilled through seller-specific child orders/fulfillment legs. Each leg retains its seller, items, pickup point, price allocation, status, cancellation/refund boundary and proof of delivery.
2. A delivery provider may accept a delivery batch containing multiple seller pickups when the route is operationally compatible. Example: three shops in Cidade da China, one customer destination, one motorcycle and one courier.
3. A batch is not restricted to identical pickup coordinates. It can contain nearby pickup stops and one destination or a small compatible destination cluster, subject to route detour, vehicle capacity, parcel constraints, food-safety constraints and promised delivery windows.
4. The customer sees one consolidated delivery journey where appropriate, while retaining item/package-level status and proof for each seller leg.
5. Seller-owned delivery remains supported. A seller can fulfil its own leg; other legs in the same parent purchase may use MARKA dispatch. Mixed delivery modes must not corrupt the aggregate order status.
6. Marketplace commission is calculated on the global customer-facing amount according to configured commercial policy, with product, seller delivery, platform delivery and tax/fee components recorded separately. Never infer or silently change the financial ledger calculation; commission rules must be explicit and auditable.
7. Driver acceptance is atomic. Two providers must never claim the same leg, and a batch acceptance must either claim every included eligible leg or none.
8. A provider may only be offered a batch when all included legs remain eligible and the provider's transport mode, capacity, verification, availability and route are compatible.

## Batch discovery and acceptance

- Group eligible unassigned delivery legs by destination geofence and compatible delivery window.
- Cluster pickup points by route distance, not merely straight-line distance. A batch candidate must have one final destination (or a narrowly bounded destination cluster), acceptable added detour and an allowed pickup sequence.
- Calculate a transparent offer: pickup count and locations, destination, total route distance/time, parcel/vehicle requirements, expected payout and expiry.
- Send an offer to nearby eligible providers, progressively widening the search radius when needed.
- On acceptance, execute one database transaction: lock/claim the batch and all legs, verify each leg is still eligible, claim the provider, persist assignments, and reject the whole operation if any leg has already been claimed. Use idempotency keys for retries.
- A batch can be partially re-planned only through an explicit audited operation; never silently detach a seller leg after a provider has accepted.
- Track arrival at each pickup, each package's pickup confirmation, departure, customer approach and final handover. Each package has its own proof/OTP even when one courier completes the consolidated route.

## Live customer tracking

- Driver app/PWA sends GPS updates only during an active accepted delivery, with explicit location permission and clear foreground/background status.
- Store a throttled latest-location snapshot and append operational milestones; do not persist every GPS sample indefinitely. Retention and access are purpose-limited.
- Stream current position and status changes to the authorized customer order channel using Supabase Realtime (existing Supabase project), with authenticated channel authorization. Never broadcast a driver's location globally.
- Customer view shows courier position, route, pickup stops, current milestone, ETA range, last update time and a stale-location warning. It must distinguish live GPS from an ETA estimate.
- If connectivity drops, retain the last known location and timestamp, then resume streaming. Do not fabricate movement or claim live tracking while stale.
- Use OpenStreetMap-compatible map tiles and an open routing engine (OSRM or Valhalla) behind a provider abstraction. Respect tile/service usage policies; free public endpoints are not a production SLA. Self-hosting removes per-request licensing fees but still requires compute and operations.

## Notifications: zero licence-cost baseline

- Use standards-based Web Push (VAPID) with a service worker for installed PWA/browser push; store subscriptions per user/device, support expiry/revocation and rotate credentials securely.
- Use Supabase Realtime for in-app foreground updates and Web Push for background/offline alerts. Notification records remain durable in the application database; push delivery is an alert channel, not the source of truth.
- Use an outbox/event pattern so order, dispatch, pickup, delay, cancellation and completion events are committed before delivery attempts. Retry transient failures with backoff and deduplicate by event/device.
- Notification preferences cover sound, vibration, quiet hours and critical operational alerts. Short non-looping sounds only.
- No paid push vendor is required for the baseline. Web Push browser delivery itself is provided by browser push services; free quotas and platform policies apply. Zero licence cost is not a promise of unlimited hosting, bandwidth, maps or database usage. Self-hosting ntfy is a possible optional transport, but it still needs a server and operational maintenance.

## Existing implementation facts to preserve

- Prisma already has DeliveryAgent with transport mode, availability and last-known latitude/longitude.
- FulfillmentRequest is currently one-to-one with Order.
- DispatchRequest currently has one subjectType/subjectId, one accepted agent, and candidates; it is unique per subject.
- DispatchAdapter.accept() already uses a transaction and atomically claims an available delivery agent and dispatch request.
- FulfillmentAdapter creates a dispatch request for each individual fulfillment and persists the destination in fulfillment metadata.
- The current schema therefore does not yet represent one dispatch batch containing multiple fulfillment legs. Do not remove the single-store checkout guard or simply attach several orders to one existing dispatch row; that would bypass per-leg assignment, payment allocation, status and refund invariants.
- No durable push-subscription/notification implementation was found during this audit. Do not claim push notifications are active merely because realtime events exist.

## Required implementation sequence

1. Multi-seller commercial aggregate: parent checkout/order, seller child orders, line-level allocations, one customer payment intent/capture, idempotent payment confirmation, commission allocation and per-child refund/cancellation. Preserve the existing ledger and inventory reservation invariants.
2. Delivery batch schema: batch, batch legs (one leg per seller fulfillment), provider offer/claim, pickup stop sequence, package proof and lifecycle event records. Add uniqueness/locking constraints for active assignments.
3. Dispatch matching: nearby providers, transport/capacity/verification filters, route-based batching, progressive offer fan-out, atomic whole-batch acceptance and recovery/reassignment.
4. Durable notifications: event outbox, notification inbox, Web Push subscriptions, VAPID configuration, service worker, retries, deduplication and preferences.
5. Live tracking: authenticated Realtime channels, location update endpoint, throttling, retention, route/ETA, stale-state handling and customer UI.
6. Marketplace media: product/listing gallery accepts photos and vertical videos up to 60 seconds, with server-side duration validation, poster/thumbnail, moderation and storage lifecycle. This is a separate media pipeline but shares the listing and order context.
7. Verification: unit/integration tests for concurrent accept, mixed seller delivery modes, batch capacity, duplicate events, push expiry, lost connectivity, location privacy, partial seller cancellation/refund, inventory release, and customer-visible aggregate state; then production smoke tests.

## Acceptance scenarios

- Three sellers at the same market, same buyer destination: one compatible courier can receive and accept one three-pickup batch; only one courier can win.
- Three sellers at nearby points, same destination: batch allowed only if route detour, time window and capacity rules pass.
- Same destination but incompatible food/temperature or parcel size: separate batches.
- One seller uses own delivery and two use MARKA: aggregate checkout remains one purchase; two dispatchable legs can be batched; seller-owned leg remains independent.
- A courier loses connectivity mid-route: customer sees last update time and stale state; milestones sync when online.
- Customer tracks only their own order and cannot query unrelated driver coordinates.
- Push is disabled/expired: durable inbox still records events and in-app state remains correct.
- Two couriers accept concurrently: exactly one atomic batch claim succeeds.
