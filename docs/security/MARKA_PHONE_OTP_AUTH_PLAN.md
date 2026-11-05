# MARKA Phone OTP Authentication — Implementation Plan

## Approved product decision

- One MARKA identity shared by Marketplace and Mobility.
- Phone number is a first-class sign-in and verification identifier.
- Angola default country: AO (+244); international country selection uses E.164 normalization.
- Email becomes optional, not removed. Existing email accounts remain valid and continue to sign in.
- Password remains the normal sign-in method. Phone OTP is used for initial phone verification, phone changes, phone-based password recovery and explicitly sensitive re-authentication.
- No SMS on every login.
- Phone OTP delivery is SMS only. WhatsApp is explicitly out of scope.
- Existing email verification and recovery remain on the current MARKA email-delivery integration (Resend), independently of phone OTP.
- MIMO Verify is not selected or integrated at this stage.

## Delivery architecture

Use a provider-neutral SMS-only delivery contract. MARKA generates and verifies OTPs; the provider transports the code.

The existing email provider is confirmed in the current code as Resend (RESEND_API_KEY, RESEND_FROM_EMAIL). This is an email service, not the phone SMS provider. No Brevo/Sendinblue integration was found in the inspected production environment variables or the email-delivery service.

SMS provider selection remains open. Do not assume an existing free email provider can deliver SMS. Before selecting an SMS provider, compare Angola network coverage, price per submitted message, minimum top-up, VAT, sender ID registration, delivery receipts, API authentication, rate limits and service terms.

Never enable paid SMS delivery until the provider is selected, production credentials are supplied through Vercel Environment Variables and a controlled test budget is explicitly approved.

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

- Record every requested, accepted, delivered, failed and rejected SMS with provider, destination hash, message ID, price snapshot, currency and timestamps.
- Separate delivery events from financial usage ledger entries; do not assume an API-accepted message is delivered.
- Admin dashboard: sends, delivery rate, retries, spend, estimated spend, provider balance (only if supported), per-country cost, and daily/monthly caps.
- Alerts at 50%, 75%, 90% and 100% of the configured monthly budget.
- If provider balance is exhausted or the budget cap is reached, stop new paid sends and show a clear temporary-unavailable state. Existing valid challenges may still be verified.
- Initial planning envelope: AOA 15,000, not a provider payment instruction or committed spend. Reconcile VAT and the exact provider tariff before production.
- No WhatsApp spend, credentials, templates or delivery logic.

## Required database changes

Current production User.email and User.emailNormalized are both NOT NULL and unique. Profile.phone exists but is nullable and is not a verified identity key. The schema also has User.phoneVerifiedAt, but there is no phone OTP challenge or SMS usage ledger model.

Required backwards-compatible migration:
1. Make User.email and User.emailNormalized nullable while preserving unique constraints for non-null values.
2. Add canonical User.phoneE164 nullable with a unique index; only verified numbers may be assigned.
3. Add OTP challenge records with keyed code hash, purpose, expiry, attempt counters, consumed timestamp and delivery state.
4. Add SMS delivery/usage records for cost accounting and provider reconciliation.
5. Keep Profile.phone as a display/contact field only; do not use it as the authentication key.
6. Preserve all existing email users and sessions.

No production migration is authorized by this plan. The production migration history and schema must be reconciled first. Do not apply DDL or modify production data until a reviewed migration is committed and the exact database target is confirmed.

## Application integration sequence

1. Audit every required-email assumption across registration, login, recovery, user profile, admin, marketplace, Mobility, notifications and exports.
2. Add country picker and phone-first registration UI with optional email.
3. Add phone OTP request and verify APIs with abuse controls and provider-neutral SMS delivery.
4. Update login to accept email or E.164 phone plus password.
5. Add phone-based recovery and change-phone confirmation.
6. Add admin SMS cost dashboard and budget circuit breaker.
7. Test migration on an isolated database, run unit/integration tests, then stage rollout behind a feature flag.
8. Enable paid SMS only after provider commercial confirmation and explicit production budget approval.

## Release gates

- Existing email sign-in and password recovery continue to work.
- Phone-only account can register, verify and sign in.
- One phone cannot belong to two users.
- OTP is single-use and expires correctly.
- Resend and brute-force limits are enforced server-side.
- No paid message is sent in tests unless an explicit test SMS provider is configured.
- SMS provider outage or depleted balance does not break email-based login or existing sessions.
- No WhatsApp integration or delivery path is present.
- No schema migration is applied to production before migration-history reconciliation.