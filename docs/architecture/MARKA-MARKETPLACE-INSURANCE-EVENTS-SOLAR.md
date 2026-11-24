# MARKA Marketplace: Insurance, Event Ticketing and Solar Energy

## Scope

This document defines the next marketplace verticals. The category seed change only makes the verticals discoverable; it does not claim that insurance quotation, policy issuance, ticket checkout, payment settlement or gate scanning are implemented.

## Marketplace categories

- **Seguros e proteção**, offers published by licensed insurers or duly authorized intermediaries.
- **Eventos e bilhética**, event discovery, organizer pages, ticket inventory and admission.
- **Energia solar e soluções energéticas**, solar panels, inverters, batteries, installation, maintenance and commercial/industrial energy solutions.

Categories remain additive and are seeded idempotently through the existing category seed. Do not replace or rename existing marketplace categories.

## Insurance vertical

### Seller eligibility and trust
- An insurer or intermediary must complete business verification and submit applicable Angolan licensing/authorization evidence before publishing insurance products.
- Keep the seller's legal identity, registration details, license/authorization status, expiry and verification audit trail.
- Unverified sellers may create a draft profile but must not advertise a policy as approved or accept an insurance application through MARKA.
- MARKA must not underwrite, price risk, bind cover, issue policies or represent itself as the insurer unless separately authorized to do so.

### Product and conversion
- Product pages identify the insurer, type of cover, eligibility, exclusions, premium/payment frequency, required documents, claims channel and policy wording.
- A lead/request flow may collect only the minimum information needed and must obtain explicit consent before sharing it with the insurer.
- Policy issuance and binding confirmation remain with the insurer's authorized system. Store a reference and status only after server-to-server confirmation or verified provider callback.
- Never display a policy as active based solely on a client redirect or uploaded screenshot.
- Support motor, travel, property, health, life and business cover as catalog types only; each launch is subject to legal review and insurer capability.

### Monetization
- Start with paid qualified leads or a disclosed referral fee under a written agreement.
- Commission on premiums or policy sales only where legally permitted and contractually agreed.
- No customer funds or premiums should be held in a MARKA wallet. Route payment to the insurer or its authorized payment collection channel.

## Event ticketing vertical

### Organizer and event controls
- Organizer identity and payout destination must be verified before paid ticket sales are enabled.
- Event data includes venue, schedule/time zone, capacity, ticket classes, price, sale window, cancellation/refund rules and organizer contact.
- Inventory must be reserved and decremented atomically; concurrent checkout must never oversell capacity.
- Paid ticket issuance occurs only after authoritative payment confirmation. Pending or failed payments do not create usable tickets.

### Anti-counterfeit admission
- Each issued ticket gets a cryptographically random, unguessable ticket identifier. Do not encode personal data or a predictable database ID in the QR.
- QR payload should be a signed, short-lived or opaque token resolved by the MARKA server; use key rotation and signature verification.
- The admission scanner must call a server endpoint online to atomically transition a ticket from ISSUED to CHECKED_IN. The first valid scan succeeds; replayed scans are rejected and logged.
- Provide clear scanner feedback: valid, already used, cancelled/refunded, wrong event, not yet valid, or unverifiable.
- Bind ticket to event and ticket class. Support transfer only through a controlled transfer flow that revokes the old credential and issues a new one.
- Include organizer-side attendee lists, scan audit log, per-gate/device operator permissions and manual exception workflow.
- For low-connectivity venues, design a separately reviewed offline mode using signed manifests, bounded validity windows and conflict reconciliation. Do not claim perfect duplicate prevention while multiple scanners are disconnected.
- A screenshot of a QR code must not be treated as proof of ownership; ticket status on the server is authoritative.

### Refunds and fraud controls
- Cancellation/refund changes ticket status and invalidates the admission credential.
- Rate-limit scan and lookup endpoints, protect organizer APIs, log suspicious repeated attempts and avoid exposing attendee personal data to scanners.
- Clearly disclose fees, refund rules, event changes and data processing before checkout.

### Monetization
- Start with a transparent per-ticket service fee or organizer subscription; show fees before payment.
- Do not release organizer proceeds until payment is confirmed and the agreed settlement conditions are met.
- Keep MARKA commission separate from organizer proceeds in accounting. No informal custody of seller funds.

## Solar energy vertical

This is the recommended additional industry for wider commercial reach in Angola. It supports both retail and B2B transactions:
- panels, inverters, batteries, charge controllers and mounting equipment;
- turnkey residential and commercial installation;
- maintenance, diagnostics and replacement parts;
- solar water pumping and agricultural systems;
- energy storage and backup solutions for shops, offices, farms and industrial sites.

Require clear technical specifications, warranty terms, installation scope, geographic coverage and after-sales support. Distinguish product-only listings from installation contracts and recurring maintenance services.

## Shared platform requirements

- Reuse existing MARKA accounts, stores, verification, catalog, orders and messaging where suitable; do not create a parallel identity or wallet.
- Add dedicated domain models and permissions for insurance applications and events/tickets rather than forcing these into generic Product rows.
- Use server-side authorization, idempotency keys, audit events and immutable transaction references.
- Keep personal data minimization, consent, retention and access controls explicit.
- Do not activate live payments, insurer integrations, SMS or paid vendor services until contracts, credentials, sandbox tests and explicit approval exist.
- Add automated tests for authorization, concurrent inventory, duplicate scans, payment callbacks, cancellation/refund and seller verification before production rollout.

## Delivery sequence

1. Marketplace discovery categories (this change).
2. Organizer and insurer onboarding/verification, with no live money movement.
3. Event creation and free-ticket issuance plus server-side QR scan lifecycle.
4. Paid ticket checkout only after the existing MARKA payment integration is verified end to end.
5. Insurance lead/referral flow; direct policy issuance only after legal and technical partner validation.
6. Solar catalog enrichment and B2B quote requests.

## Release boundary

The category seed change does not implement any of the workflows above and does not authorize production migrations, seed execution, payment activation or insurer partnerships. Those require separate implementation, tests and release approval.
