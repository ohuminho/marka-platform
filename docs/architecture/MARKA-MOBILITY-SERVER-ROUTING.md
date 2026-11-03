# MARKA Mobility — server-side routing

## Implemented adapter

The Mobility backend now has a server-only OSRM adapter at
`src/services/mobility/pricing/mobility-routing.service.ts`.

- Accepts validated WGS84 origin/destination coordinates.
- Calls OSRM's driving route endpoint from the server.
- Requests only route distance and duration (no geometry or turn-by-turn payload).
- Enforces a bounded timeout and rejects malformed, non-positive, or implausible measurements.
- Does not trust distance/duration supplied by the browser.
- Does not silently fall back to the public OSRM demo server.

## Required deployment configuration

Set `MOBILITY_ROUTING_BASE_URL` in the Vercel production environment to an OSRM-compatible endpoint operated by MARKA or an approved provider. The value is the service base URL, not the full `/route/v1/... ` path.

Do not use the public OSRM demo server as a production dependency: it is a community demo endpoint, not a production SLA.

## Still intentionally blocked

This adapter is not yet connected to fare authorization. The fare endpoint remains fail-closed until all of the following are implemented and validated:

1. Versioned server-owned tariff records for each service class.
2. Immutable quote persistence linked to a ride, with expiry and idempotency.
3. Server-side peak-period policy and promotion budget accounting.
4. Quote-to-payment authorization binding.
5. Migration applied to the production database and verified.
6. A production routing endpoint configured and health-checked.

No default fares are invented. Taxi, moto-taxi, cargo and roadside assistance require separate tariff schedules.
