# MARKA Mobility — server-side routing

## OpenRouteService alternative (free hosted pilot)

The server-only adapter also supports OpenRouteService (HeiGIT). Select it explicitly with `MOBILITY_ROUTING_PROVIDER=OPENROUTESERVICE` and configure `OPENROUTESERVICE_API_KEY` as a server-only Vercel environment variable. The current API base is `https://api.heigit.org/openrouteservice/`; the retired `api.openrouteservice.org` hostname must not be used.

HeiGIT provides a free Standard API key after account registration and has confirmed that commercial use is permitted within the Standard plan limits. The API is quota-limited and does not provide a production SLA. Check the account dashboard for current per-service quotas before launch. Directions results are licensed under CC-BY-SA 4.0; legal review must confirm the attribution and handling of derived results.

```env
MOBILITY_ROUTING_PROVIDER=OPENROUTESERVICE
OPENROUTESERVICE_API_KEY=<secret stored only in Vercel server environment>
# Optional; this is the default base URL:
OPENROUTESERVICE_BASE_URL=https://api.heigit.org/openrouteservice/
```

Never use a `NEXT_PUBLIC_` variable for the key, expose it to browser code, or commit it to Git. Do not enable billing or upgrade to a paid plan.

The adapter requests driving-car GeoJSON directions and duration matrices server-side, validates geometry and measurements, and handles provider quota errors. Provider selection is explicit: there is no silent fallback between routing engines because different road graphs can change distance, duration and fare. A failed route request must fail closed without inventing a route or price.

The OpenRouteService free hosted API is a candidate for the MARKA pilot, not yet an approved production dependency. Live tests must validate representative routes in Luanda and across Angola, provider quotas, timeouts, no-route behaviour, tariff calculations, attribution and licensing before production activation.

## Implemented adapter

The Mobility backend has a server-only routing adapter at
`src/services/mobility/pricing/mobility-routing.service.ts`.

- Accepts validated WGS84 origin/destination coordinates.
- Calls OSRM's driving route endpoint from the server.
- Provides a lightweight distance/duration estimate and a GeoJSON route geometry endpoint for MapLibre; no turn-by-turn instruction payload is requested.
- Enforces a bounded timeout and rejects malformed, non-positive, or implausible measurements.
- Does not trust distance/duration supplied by the browser.
- Supports OSRM and OpenRouteService through an explicit server-side provider selection.
- Supports a managed OSRM endpoint through `MOBILITY_ROUTING_BASE_URL` and the HeiGIT hosted API through `OPENROUTESERVICE_API_KEY`.

## Required deployment configuration

For no-key development, OSRM remains the default adapter. Do not treat the public OSRM demo as a production dependency. For the free hosted OpenRouteService pilot, configure `MOBILITY_ROUTING_PROVIDER=OPENROUTESERVICE` and a free HeiGIT API key as described above. No provider is silently substituted if the selected one fails.

## Passenger map UI

The passenger entry point at `/app/mobility` is a full-viewport MapLibre GL JS experience using OpenFreeMap's dark vector style and OpenStreetMap attribution. Destination autocomplete uses Photon global search without an Angola-only filter. The MARKA landmark catalogue is also country-aware: searches can span all countries or optionally filter by a two-letter ISO 3166-1 alpha-2 country code. The map starts at a neutral world view and uses GPS only when the user grants permission. No mapping API key is required. Driver GPS markers are updated from the existing ride polling endpoint and rotate using the recorded GPS heading when available.

The public OpenFreeMap/Photon services are suitable for a zero-cost pilot, not a guaranteed high-volume service. Preserve attribution and observe each service's fair-use policy.

## International market readiness

The geospatial layer is global-capable, subject to OpenStreetMap/Photon coverage and each public service's fair-use limits. This does not by itself activate paid mobility operations in every country.

Before enabling a country for real trips, MARKA must configure and verify:
- Country and market identity (ISO 3166-1 alpha-2), supported service classes and operating cities.
- Local currency (ISO 4217), minor-unit precision, country-specific tariffs, commissions, taxes and settlement rules.
- Local timezone, distance units, number/address formatting and language defaults.
- Driver identity, driving licence, vehicle registration, insurance, inspection and transport permits required by that jurisdiction.
- Payment provider availability, payout rails, consumer-protection rules, privacy/data residency and emergency escalation.
- Routing coverage and service quality for the actual road network, including ferries, borders and restricted roads where relevant.

Current production domain defaults still include Angola-specific driver onboarding and AOA fare calculation. Until those are replaced by verified per-market configuration and legal review, global search/map support must not be represented as worldwide ride-service activation. Angola remains the initial configured market.

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
