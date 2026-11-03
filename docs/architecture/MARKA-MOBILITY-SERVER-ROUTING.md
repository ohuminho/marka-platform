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
