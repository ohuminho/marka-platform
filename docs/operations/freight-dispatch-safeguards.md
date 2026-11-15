# MARKA Freight dispatch safeguards

This document records the current server-side eligibility rules for freight providers. These rules are enforced by the API; the dashboard is not the source of truth.

## Provider location

- A verified provider must explicitly activate GPS sharing in the freight jobs dashboard.
- The browser sends a fresh GPS fix immediately and refreshes it every 30 seconds while the dashboard remains open.
- A fix is eligible only when its reported accuracy is at most 1,000 metres and its timestamp is no older than 3 minutes.
- A paid offer is shown only when its pickup point is within 20 km of the provider's latest eligible location.
- Cargo and roadside pickup use the request origin. Water delivery uses the delivery destination because the request has no pickup point.
- The API rechecks location freshness, accuracy and distance when the provider accepts an offer.
- Only the provider's latest coordinates are stored on the provider record. The location endpoint does not create a public location feed or a location history.
- Explicitly stopping GPS sharing clears the saved coordinates. Leaving the freight jobs component stops updates; if the browser closes unexpectedly, the last fix becomes ineligible after 3 minutes.

## Multiple active assignments

A provider may accept an additional job only if the server can prove that the combined load is safe:

- All active jobs and the new job must use the same registered vehicle.
- Jobs must belong to the same service family: cargo with cargo, or water with water.
- Delivery destinations must be within 5 km of one another.
- The new job and every active job must declare quantities in compatible units.
- The combined declared quantity must not exceed the registered vehicle capacity.
- Water deliveries must use the same water type and a registered water tanker.
- Cargo jobs without declared weight or volume remain single-assignment. The first job may still be accepted, but it cannot be grouped with another job without quantity data.
- Roadside assistance remains single-assignment.

Capacity conversions are explicit: tonnes to kilograms and cubic metres remain separate dimensions; water cubic metres are converted to litres. The engine never compares weight with volume.

## Operational limitations

- GPS sharing stops when the provider stops it or leaves the freight jobs component. The last saved fix becomes ineligible automatically after 3 minutes.
- Browser geolocation requires user permission and a secure context.
- A provider must keep the dashboard open for location refreshes. Background tracking is not claimed or implemented here.
- The 20 km pickup radius and 5 km destination grouping radius are current conservative defaults, not yet configurable by administrators.
- The server remains authoritative if the browser displays a stale offer: acceptance is rejected if any rule no longer passes.

## Deployment

The Prisma schema and migration are committed on the feature branch. Do not apply the migration to the production database or deploy the application until the change has passed GitHub CI and the deployment window is available.
