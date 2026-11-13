# MARKA Phone OTP — Mainline Integration Audit

Date: 2026-11-13
Base: `main` at `88451e398662c3ce5d407a323afe81f13306c3da`
Working branch: `feat/marka-phone-otp-mainline`
Related foundation PR: #14 (draft; not merged)

## Product and architecture decisions

- MARKA owns OTP generation, challenge persistence, verification, expiry, attempt limits, one-time consumption and abuse controls.
- MIMO Verify is a transport adapter for SMS only. It must not generate or validate codes and must not own MARKA identity.
- Email verification and recovery continue through the existing Resend implementation.
- Existing email accounts and sessions must remain compatible.
- Phone and email resolve to one MARKA identity shared by Marketplace and Mobility.
- No Supabase Auth phone provider, Twilio, WhatsApp or MIMO-hosted OTP validation.
- No paid SMS activation until Backbone confirms authentication headers, response/error contract, idempotency, delivery semantics, pricing and credentials.

## Mainline facts verified on 2026-11-13

1. `src/app/api/auth/login/route.ts` reads only `body.email`, normalizes it and queries `User.emailNormalized`. It does not accept `identifier` or phone.
2. The login route requires a password and rejects `PENDING_VERIFICATION` users with `EMAIL_VERIFICATION_REQUIRED`.
3. `src/app/api/auth/register/route.ts` requires name, email and password; it creates a `PENDING_VERIFICATION` user and sends a verification email through `verificationDeliveryService`.
4. `prisma/schema.prisma` on this base has no `User.phoneE164`, phone OTP challenge model or SMS ledger model.
5. `package.json` provides `build`, `lint` and `test:unit`; there is no dedicated OTP integration-test script on this base.
6. The foundation PR #14 is open, draft and currently not mergeable. Its head is based on a substantially older mainline and its patch must be selectively ported, not merged wholesale.

## Port candidates from PR #14 (re-audit before copying)

- E.164 phone normalization.
- Email-or-phone login identifier parser.
- Cryptographically secure six-digit OTP generation and challenge-bound HMAC.
- OTP policy constants and SMS provider contract.
- MIMO Verify adapter, but only after correcting/confirming idempotency behavior and treating provider acceptance as distinct from delivery.
- Prisma challenge and SMS ledger models/migration, after validating relation names and migration compatibility against current main.
- Super Admin usage visibility, after validating current admin authorization and accounting model.

Do not copy the old LoginForm/auth client changes without reconciling the current API contract. The old PR uses `identifier`; main currently expects `email`.

## Implementation sequence and release gates

### Phase 1 — Foundation reconciliation
- Rebase the design, not the old branch.
- Re-check current auth/session/password/verification services and every email-required assumption.
- Define a backward-compatible request contract: accept `identifier` and legacy `email` during transition; keep response shape stable.
- Add phone identity fields and OTP tables only after Prisma relation and migration validation.

### Phase 2 — MARKA OTP Core
- Create challenge server-side with CSPRNG code and keyed HMAC; never persist plaintext.
- Persist challenge and SMS ledger state safely.
- Enforce E.164, expiry, resend cooldown, per-phone/IP limits, max attempts and budget caps server-side.
- Consume challenge atomically and exactly once; handle concurrent verification and unique-phone races.
- Return generic responses where account existence could otherwise be enumerated.
- Never log OTP, full phone numbers, API secrets or raw request bodies.

### Phase 3 — Account flows
- Phone-first signup: create a pending account, verify the phone, then activate according to the agreed account policy.
- Existing email signup/login/recovery via Resend remains unchanged.
- Phone login: phone must be verified and uses the existing password; OTP is not required on every login.
- Phone recovery and phone-change confirmation use separate challenge purposes and explicit security checks.
- Do not make email nullable until all email-dependent services, admin, Marketplace, Mobility, notifications and exports have been audited and migrated.

### Phase 4 — Provider and operations
- MIMO adapter remains disabled/fail-closed without confirmed provider contract and credentials.
- Distinguish API accepted from delivered.
- Use an idempotency strategy supported by the provider contract; do not assume an undocumented header.
- Record cost only from confirmed commercial terms; budget envelope is a cap, not payment authorization.
- SMS failure must not break email login or existing sessions.

### Phase 5 — Verification and release
- Prisma format/validate/generate and isolated-database migration test.
- Unit tests for crypto, parsing, E.164 and provider contract.
- Integration tests for signup, verify, duplicate phone, expiry, resend, brute force, concurrency, recovery and phone change.
- Regression tests for email registration, verification, login, recovery and session behavior.
- Lint and production build.
- Feature-flagged staging before any production migration.
- Production SMS requires a separate explicit activation approval.

## Current status

This branch contains this audit only. No production code, database schema, secrets, provider credentials, Supabase settings or production deployments have been changed.
