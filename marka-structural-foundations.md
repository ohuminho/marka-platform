# MARKA structural foundations

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
