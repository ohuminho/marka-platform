# MARKA Mobility — server-side routing

## Routing providers

The server-only adapter at `src/services/mobility/pricing/mobility-routing.service.ts` supports two backends:

- **OpenRouteService (preferred free hosted pilot):** set `MOBILITY_ROUTING_PROVIDER=OPENROUTESERVICE` and configure `OPENROUTESERVICE_API_KEY` as a server-only Vercel environment variable. The adapter uses the current HeiGIT endpoint `https://api.heigit.org/openrouteservice/`, not the retired `api.openrouteservice.org` hostname.
- **OSRM:** set `MOBILITY_ROUTING_PROVIDER=OSRM` and optionally `MOBILITY_ROUTING_BASE_URL`. If no URL is configured, the adapter uses the public OSRM demo for development only.

The provider is selected explicitly. There is no silent provider fallback: silently switching road networks can change distance, duration and fare. If the configured provider fails, MARKA must show that routing is temporarily unavailable and must not invent a route or fare.

## OpenRouteService free-plan conditions

HeiGIT publishes a free Standard API key after account registration. Its support team has confirmed that commercial use is permitted within the Standard plan limits. The free hosted API is quota-limited and has no production SLA; consult the current account dashboard for exact per-service limits before launch. The Directions results are published under CC-BY-SA 4.0. Legal review must confirm how MARKA displays attribution and handles any derived route data before production activation.

Required server environment:
```env
MOBILITY_ROUTING_PROVIDER=OPENROUTESERVICE
OPENROUTESERVICE_API_KEY=<secret stored only in Vercel server environment>
# Optional; default is https://api.heigit.org/openrouteservice/
OPENROUTESERVICE_BASE_URL=https://api.heigit.org/openrouteservice/
```

Never prefix the key with `NEXT_PUBLIC_`, expose it to browser code, commit it to Git, or send it in client requests. Register a free key directly with HeiGIT. No paid plan is required for the pilot; do not upgrade or enable billing.

## Implemented adapter behaviour

- Validates WGS84 coordinates before sending a request.
- Requests driving-car directions as GeoJSON and extracts road distance/duration from the provider's route summary.
- Requests duration matrices for the bounded shared-ride matching workflow.
- Validates route geometry and all returned measurements.
- Applies a bounded network timeout and handles provider rate-limit responses distinctly.
- Keeps all routing calls server-side; the browser never receives the API key.
- Does not trust distance/duration supplied by the browser.
- Supports OSRM as an alternate open-source backend without changing the fare engine.

## Passenger map UI

The map renderer, place search/geocoding and road routing are separate capabilities. A visible map tile does not prove that a road route exists. Passenger route geometry and fare are returned by the authenticated MARKA backend. The server calculates the fare from the provider's road distance and duration using MARKA's approved tariff table.

The map currently uses OpenFreeMap vector tiles with OpenStreetMap data attribution. Map tiles and place-search services have independent usage policies and must be reviewed separately from routing. Display the required OpenStreetMap attribution.

## Validation before activation

A successful build or mocked unit test is not proof of live route coverage. Before switching production:
1. Configure a free HeiGIT Standard key in a non-production environment.
2. Run live route tests using representative known drivable coordinates in Luanda and then in all 21 Angolan provinces.
3. Verify geometry, road distance and duration against the route planner and actual road conditions.
4. Verify no-route behaviour, API quota exhaustion, timeout, authentication failure and recovery.
5. Verify taxi and mototáxi fare calculations from server-returned route measurements.
6. Verify that the public-facing attribution and CC-BY-SA obligations are satisfied.
7. Only after these checks pass, set the provider in Vercel Production and monitor usage against the free quota.

## OSRM national hosting option

OSRM remains a self-hostable open-source option for later, if MARKA obtains a persistent host. The national Angola preparation scripts live in `infra/osrm/`. The public OSRM demo is community-operated, has no production SLA and must not receive sustained high-volume commercial traffic. A national OSRM graph requires a persistent Docker-capable machine; Vercel Functions and the user's mobile phone are not suitable hosts.

## Tariff and fare estimate

The route endpoint returns server-calculated distance/duration and, when a tariff is configured, a fare estimate. Ride creation independently recalculates the route and fare on the server; the browser's submitted amount is ignored. The server persists the authoritative `estimatedFareMinor` in ride metadata and excludes that server-derived amount from the idempotency request fingerprint so retries do not fail when route measurements vary slightly.

No fallback rates are invented. Configure the approved per-class values in Vercel Production (amounts are integer AOA minor units; 100 minor units = 1 Kz):

- `MARKA_MOBILITY_TAXI_BASE_FARE_MINOR`, `MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM`, `MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE`
- Repeat the same suffixes for `MOTO_TAXI` and any other service class only after its tariff is approved.
- Optional per-class values: `BOOKING_FEE_MINOR` and `MINIMUM_FARE_MINOR`.

The approved initial tariffs remain:
- Taxi normal: 250 Kz base + 75 Kz/km + 30 Kz/min, minimum 500 Kz.
- Moto-táxi: 150 Kz base + 100 Kz/km + 20 Kz/min, minimum 350 Kz.

Until the required values exist for a category, the interface displays that the tariff is pending and the API refuses ride creation for that category. This is intentional: a real route does not justify inventing a fare.

This is an estimated fare, not an immutable payment quote. Expiring quote IDs, tariff versioning, peak/surge policy, promotion-budget reservation and payment authorization binding remain separate activation gates. No discount is applied until those controls are integrated.
