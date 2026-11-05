# MARKA Phone OTP Authentication — Implementation Plan

## Decision

- One MARKA identity shared by Marketplace and Mobility.
- Phone number is a first-class sign-in and verification identifier.
- Angola default country: AO (+244); international country selection uses E.164 normalization.
- Email becomes optional, not removed. Existing email accounts remain valid and continue to sign in.
- Password remains the normal sign-in method. OTP is used for initial phone verification, phone changes, password recovery when the phone channel is selected, and explicitly sensitive re-authentication.
- No SMS on every login.

## Delivery architecture

Use a provider-neutral delivery contract. The application generates and verifies OTPs; the delivery provider only transports the code.

Initial provider candidate:
- Angola SMS: MIMO Verify, subject to written confirmation of pricing, minimum top-up, VAT, expiry, API authentication, delivery receipts and service-level terms.
- WhatsApp: fallback only after separate template and price confirmation.
- Email: optional existing Resend channel.

Never enable paid delivery until production credentials are supplied through Vercel Environment Variables and a controlled test budget is approved.

## OTP security policy

- Cryptographically random 6-digit code.
- Store only a keyed hash/HMAC of the code, never plaintext.
- Five-minute expiry; one-time use; atomic consume operation.
- 60-second resend cooldown.
- Maximum 5 send attempts per phone per rolling hour and 10 per IP per rolling hour (initial configurable defaults).
- Maximum 5 incorrect attempts per challenge; then invalidate the challenge.
- Generic responses to avoid account enumeration.
- Normalize phone numbers to E.164 before lookup and uniqueness checks.
- Do not log OTP values, provider credentials, full phone numbers, or raw request bodies.
- Use provider idempotency keys where supported.
- A provider timeout is an ambiguous delivery state: do not blindly resend; record provider request state and reconcile before retry.

## Cost control and operations

- Record every requested, accepted, delivered, failed and rejected send with provider, channel, destination hash, message ID, price snapshot, currency, and timestamps.
- Separate delivery events from financial usage ledger entries; do not assume an API-accepted message is a delivered message.
- Admin dashboard: sends, delivery rate, retries, spend, estimated spend, provider balance (only if supported), per-country cost, and daily/monthly caps.
- Alerts at 50%, 75%, 90%, and 100% of the configured monthly budget.
- If provider balance is exhausted or the budget cap is reached, stop new paid sends and show a clear temporary-unavailable state. Existing valid challenges may still be verified.
- Initial planning envelope: AOA 15,000, not a provider payment instruction or committed spend. Reconcile VAT and the exact provider tariff before production.

## Required database changes

Current production User.email and User.emailNormalized are both NOT NULL and unique. Profile.phone exists but is nullable and is not a verified identity key. The schema also has User.phoneVerifiedAt, but there is no phone OTP challenge or delivery ledger model.

Required backwards-compatible migration:
1. Make User.email and User.emailNormalized nullable while preserving unique constraints for non-null values.
2. Add canonical User.phoneE164 nullable with a unique index; only verified numbers may be assigned.
3. Add OTP challenge records with keyed code hash, purpose, expiry, attempt counters, consumed timestamp and delivery state.
4. Add OTP delivery/usage records for cost accounting and provider reconciliation.
5. Keep Profile.phone as a display/contact field only; do not use it as the authentication key.
6. Preserve all existing email users and sessions.

No production migration is authorized by this plan. The production migration history and schema must be reconciled first. Do not apply DDL or modify production data until a reviewed migration is committed and the exact database target is confirmed.

## Application integration sequence

1. Audit every required-email assumption across registration, login, recovery, user profile, admin, marketplace, Mobility, notifications and exports.
2. Add country picker and phone-first registration UI with optional email.
3. Add phone OTP request and verify APIs with abuse controls and provider-neutral delivery.
4. Update login to accept email or E.164 phone plus password.
5. Add phone-based recovery and change-phone confirmation.
6. Add admin cost dashboard and budget circuit breaker.
7. Test migration on an isolated database, run unit/integration tests, then stage rollout behind a feature flag.
8. Enable paid delivery only after provider commercial confirmation and explicit production budget approval.

## Release gates

- Existing email sign-in and password recovery continue to work.
- Phone-only account can register, verify and sign in.
- One phone cannot belong to two users.
- OTP is single-use and expires correctly.
- Resend and brute-force limits are enforced server-side.
- No paid message is sent in tests unless an explicit test provider is configured.
- Provider outage or depleted balance does not break email-based login or existing sessions.
- No schema migration is applied to production before migration-history reconciliation.
