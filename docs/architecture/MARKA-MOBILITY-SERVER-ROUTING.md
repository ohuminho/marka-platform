# MARKA Mobility — server-side routing

## Implemented adapter

The Mobility backend now has a server-only OSRM adapter at
`src/services/mobility/pricing/mobility-routing.service.ts`.

- Accepts validated WGS84 origin/destination coordinates.
- Calls OSRM's driving route endpoint from the server.
- Provides a lightweight distance/duration estimate and a GeoJSON route geometry endpoint for MapLibre; no turn-by-turn instruction payload is requested.
- Enforces a bounded timeout and rejects malformed, non-positive, or implausible measurements.
- Does not trust distance/duration supplied by the browser.
- Uses the public OSRM demo endpoint as a zero-cost pilot fallback when no server URL is configured.
- Supports an operator-managed OSRM endpoint through `MOBILITY_ROUTING_BASE_URL`.

## Required deployment configuration

For pilot traffic, the adapter defaults to `https://router.project-osrm.org/` and requires no API key. The public demo is community-operated, has no production SLA and must not receive sustained high-volume commercial traffic. Before scaling, deploy an open-source OSRM instance and set `MOBILITY_ROUTING_BASE_URL` in Vercel to its base URL (not the full `/route/v1/...` path).

## Passenger map UI

The passenger entry point at `/app/mobility` is a full-viewport MapLibre GL JS experience using OpenFreeMap's dark vector style and OpenStreetMap attribution. Destination autocomplete uses Photon with Angola-only result filtering. No mapping API key is required. Driver GPS markers are updated from the existing ride polling endpoint and rotate using the recorded GPS heading when available.

The public OpenFreeMap/Photon services are suitable for a zero-cost pilot, not a guaranteed high-volume service. Preserve attribution and observe each service's fair-use policy.

## Tariff and fare estimate

The route endpoint now returns server-calculated distance/duration and, when a tariff is configured, a fare estimate. Ride creation independently recalculates the route and fare on the server; the browser's submitted amount is ignored. The server persists the authoritative `estimatedFareMinor` in ride metadata and excludes that server-derived amount from the idempotency request fingerprint so retries do not fail when OSRM measurements vary slightly.

No fallback rates are invented. Configure all three required values per service class in Vercel Production (amounts are integer AOA minor units; 100 minor units = 1 Kz):

- `MARKA_MOBILITY_TAXI_BASE_FARE_MINOR`, `MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM`, `MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE`
- Repeat the same suffixes for `EXECUTIVE`, `MOTO_TAXI`, `VAN`, `PICKUP`, `MEDIUM_TRUCK`, `TIPPER_TRUCK`, and `HEAVY_TRUCK`.
- Optional per-class values: `BOOKING_FEE_MINOR` and `MINIMUM_FARE_MINOR`.

Until the three required values exist for a category, the interface displays that the tariff is pending and the API refuses ride creation for that category. This is intentional: a real route does not justify inventing a fare.

This is an estimated fare, not an immutable payment quote. Expiring quote IDs, tariff versioning, peak/surge policy, promotion-budget reservation and payment authorization binding remain separate activation gates. No discount is applied until those controls are integrated.


## Competitive passenger fare policy

The approved product requirement is a fixed MARKA-funded passenger discount on eligible AOA trips:

| Service class | Discount | Minor units used by the pricing engine |
| --- | ---: | ---: |
| Taxi / light passenger vehicle | 1,000 Kz | 100,000 |
| Motorcycle taxi | 500 Kz | 50,000 |

These values are fixed discounts, not percentages. Eligibility is long-distance OR configured peak period. They are not stacked. The current policy applies only to TAXI and MOTO_TAXI; cargo, vans, buses and roadside assistance need separate commercial schedules.

The pure promotion evaluator already implements the fixed discounts, checks the minimum payable fare and requires the complete discount to fit within the available MARKA promotion budget. If the budget or minimum-fare condition fails, the quote receives no discount. Do not apply a partial discount or reduce driver earnings.

Production callers must calculate peak eligibility on the server using the Africa/Luanda timezone and a versioned peak-window configuration. Never trust a browser-supplied peak flag, distance, duration, fare or discount. Long-distance thresholds and peak windows must be configured from observed local trip patterns, not guessed.

The promotion is a MARKA commercial expense. It must be accounted separately from driver earnings, driver commissions and partner settlement. MARKA must not custody partner funds; partner proceeds continue to settle directly to their beneficiaries through an authorized payment arrangement.

The passenger UI may show the actual saving against the undiscounted MARKA quote (for example, "Poupa 1.000 Kz nesta viagem"). It must not claim MARKA is cheaper than Yango, Heetch or Bolt unless a lawful, timestamped, like-for-like reference price exists for the same route, vehicle class and time.

## Live activation gates

The promotion evaluator is a domain component; it does not mean that end-to-end live quotations are operational. Keep live fare authorization fail-closed until all gates pass:

- Approved base, per-kilometre and per-minute tariffs for each service class.
- Minimum fare, booking/waiting fees and surge ceiling.
- Configured long-distance threshold and peak windows.
- Funded promotion budget with atomic reservation/consumption to prevent concurrent quotes overspending it.
- Configured and monitored production routing endpoint.
- Immutable quote persistence with unique ID, passenger/service binding, tariff and policy versions, expiry and complete amount breakdown.
- Ride creation and payment authorization bound to the immutable quote; reject expired, altered, cross-user or wrong-service quotes.
- Production migration verification and end-to-end smoke tests.

Until then, do not invent fare amounts or advertise live discounts as universally available.


## Server-side peak-period evaluation

A server-only evaluator now resolves current time in the `Africa/Luanda` timezone and matches version-controlled weekday/time windows. It supports overnight windows and uses inclusive start / exclusive end boundaries. Missing configuration means no peak-period discount is eligible.

Configure `MOBILITY_PEAK_WINDOWS` as server-owned JSON, for example:

```json
[
  { "dayOfWeek": 1, "start": "07:00", "end": "09:00" },
  { "dayOfWeek": 1, "start": "16:30", "end": "19:30" },
  { "dayOfWeek": 2, "start": "07:00", "end": "09:00" }
]
```

Day numbering is Sunday=0 through Saturday=6. The example is illustrative only; it is not an approved operational schedule. Configure actual periods after analysing local trip demand. The evaluator and its boundary/timezone tests are implemented, but it is not yet wired to a live quote endpoint; do not accept a peak-hour flag from the browser.
