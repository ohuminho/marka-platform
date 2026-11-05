# MARKA OTP Core — Provider-Neutral Architecture

**Status:** Architecture proposal; implementation and provider activation are intentionally disabled.  
**Scope:** Phone verification, login MFA, account recovery and other explicitly authorised verification purposes.  
**Non-goals:** Replacing the existing email-verification flow, sending real messages, purchasing credits, registering phone numbers, or configuring provider credentials.

## 1. Architectural decision

MARKA owns the verification lifecycle. Delivery providers are transport adapters only.

The OTP Core is responsible for:
- generating cryptographically random challenges;
- storing only a keyed digest of each code;
- enforcing purpose, destination, expiry, attempt and resend policies;
- atomically consuming a valid code exactly once;
- applying account, destination, IP and device abuse controls;
- recording privacy-safe audit events;
- selecting a delivery adapter through an explicit routing policy.

A provider must never become the authority that decides whether a MARKA challenge is valid. Provider-specific hosted OTP products are therefore not the canonical verification engine.

## 2. Logical components

```text
MARKA Identity & Security
  ├── Registration / Phone verification
  ├── Login / MFA
  └── Account recovery
          |
          v
MARKA OTP Application Service
  ├── Purpose & policy resolver
  ├── Challenge generator
  ├── HMAC digest service
  ├── Attempt / resend / abuse guard
  ├── Atomic verification & consumption
  ├── Audit event writer
  └── Delivery router
          |
          v
DeliveryPort (provider-neutral contract)
  ├── WhatsApp adapter (Meta Cloud API)       [NOT CONFIGURED]
  ├── SMS adapter (KambaSMS)                   [NOT CONFIGURED]
  ├── SMS adapter (MIMO)                       [NOT CONFIGURED]
  ├── Voice adapter (NZOJI / SIP provider)     [NOT CONFIGURED]
  └── Email adapter (existing Resend flow)     [EXISTING FLOW; NOT MIGRATED]
```

The application service must not import Meta, KambaSMS, MIMO, NZOJI, Resend SDKs, or provider-specific payload types. Adapters implement the internal delivery contract and translate only at the boundary.

## 3. Domain model

### OtpChallenge

| Field | Purpose |
|---|---|
| id | Random challenge identifier |
| subjectId | MARKA user/account identifier; nullable only for pre-account flows with a separate abuse key |
| purpose | PHONE_VERIFICATION, LOGIN_MFA, PASSWORD_RECOVERY, or a future allowlisted purpose |
| channel | WHATSAPP, SMS, VOICE, EMAIL |
| destinationFingerprint | HMAC fingerprint of normalized destination; avoid plaintext phone/email in challenge rows |
| codeDigest | HMAC-SHA-256 digest of challenge ID + purpose + code |
| status | PENDING, VERIFIED, EXPIRED, LOCKED, CANCELLED, DELIVERY_FAILED |
| expiresAt | Absolute expiry timestamp |
| attempts | Failed verification count |
| maxAttempts | Snapshot of policy at issue time |
| resendAvailableAt | Earliest permitted resend time |
| consumedAt | Set exactly once on successful verification |
| provider | Internal adapter identifier, not a credential |
| providerMessageId | Provider message reference, when available |
| createdAt / updatedAt | Audit timestamps |

### OtpDeliveryAttempt

Separate delivery attempts from challenge state so retries and channel fallback do not create new valid codes accidentally. Store adapter, result class, provider reference, retry number and timestamps. Never store the OTP, auth token, API key, request Authorization header, or full provider response.

### OtpSecurityEvent

Append-only security events: challenge requested, delivery accepted/failed, invalid attempt, rate-limited, expired, consumed, cancelled. Keep metadata allowlisted and redact destination values. Do not log raw codes.

Database access must be server-side only. Enable RLS and revoke direct table access from client roles, matching the existing sensitive server-owned data patterns. Add indexes for subject/purpose/status/expiry, destination fingerprint/createdAt and cleanup by expiry.

## 4. Initial policy defaults

These are conservative starting values, not immutable constants:

| Control | Initial value |
|---|---:|
| Code length | 6 decimal digits |
| Code lifetime | 5 minutes |
| Failed attempts | 5 per challenge |
| Resend cooldown | 60 seconds |
| Active challenges | 1 per subject + purpose + destination |
| Delivery concurrency | 1 active send per challenge |
| Device/account caps | Configurable policy, enforced server-side |

Use `node:crypto` cryptographic randomness. Generate codes with unbiased rejection sampling (do not use `Math.random()` or naive modulo reduction). Store HMAC-SHA-256 using a dedicated server secret and compare digests in constant time. The HMAC secret must be separate from database credentials and provider credentials, rotated under a documented key-version strategy, and never exposed to browser code.

Rate limits must be layered: destination fingerprint, account/subject, IP, device/session and global provider budget. Return generic responses that do not disclose whether a phone number or account exists.

A successful verification must use a conditional database update inside a transaction: challenge is still PENDING, not expired, attempts remain, and consumedAt is null. Exactly one concurrent request may consume it. Increment failed attempts atomically; lock at the configured threshold.

## 5. Provider-neutral TypeScript boundary

The application layer should depend on a minimal port, conceptually:

```ts
type OtpChannel = "WHATSAPP" | "SMS" | "VOICE" | "EMAIL";

interface OtpDeliveryRequest {
  challengeId: string;
  destination: string;
  code: string;
  expiresAt: Date;
  locale: string;
  purpose: string;
}

interface OtpDeliveryResult {
  accepted: boolean;
  providerMessageId?: string;
  retryable: boolean;
  failureCode?: string;
}

interface OtpDeliveryPort {
  readonly channel: OtpChannel;
  send(input: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}
```

The code is passed to an adapter only for the duration of delivery and must not be logged or persisted by the adapter. Provider errors must be mapped to a small internal taxonomy; raw response bodies are not returned to clients.

## 6. API contract (proposed)

- `POST /api/otp/challenges`: authenticated or purpose-specific pre-auth request; validates purpose, destination, channel consent and policy; returns a generic acknowledgement and challenge reference.
- `POST /api/otp/challenges/:id/verify`: validates the code and atomically consumes the challenge.
- `POST /api/otp/challenges/:id/resend`: enforces cooldown and delivery limits; reuses or rotates a challenge according to policy, never extending expiry silently.
- `DELETE /api/otp/challenges/:id`: cancels an unconsumed challenge where the caller is authorised.

Never accept a client-supplied user ID as proof of identity. Resolve authenticated subjects from the server session. Pre-auth flows need separate anti-enumeration controls and opaque challenge references.

## 7. Routing and fallback

Routing is explicit and consent-aware:
1. Use only the channel selected or explicitly consented to by the user.
2. Do not assume that every phone number has WhatsApp.
3. If delivery fails, offer another permitted channel; do not silently switch to a paid channel.
4. Keep the same challenge only when its remaining lifetime and security policy permit; otherwise cancel and issue a new challenge.
5. Apply provider circuit breakers and budget ceilings. No unbounded retry loops.

Recommended initial channel order is a product decision, not hard-coded architecture. The MARKA core must work with zero providers configured and return a controlled `DELIVERY_UNAVAILABLE` state without pretending a message was sent.

## 8. Existing MARKA integration

The repository already has:
- `User.phoneVerifiedAt`;
- `Profile.phone` and `Profile.countryCode`;
- email verification through `VerificationService` and `VerificationDeliveryService` (Resend).

Do not treat `phoneVerifiedAt` as proof that an OTP flow exists. The existing email token flow is separate and remains unchanged in this foundation phase. A later integration can set `phoneVerifiedAt` only after successful MARKA-side OTP consumption.

## 9. Privacy, operations and abuse controls

- Normalize phone numbers to E.164 before fingerprinting or dispatch; reject ambiguous input rather than guessing a country code.
- Encrypt or otherwise tightly protect any destination needed for delivery; keep searchable fingerprints separate.
- Retain challenge rows only as long as required for abuse analysis and compliance; define deletion/retention windows before launch.
- Redact phone, email, OTP, provider secrets and authorization headers from logs/traces.
- Protect provider webhooks with signature verification, timestamp tolerance and replay/idempotency checks. Webhooks update delivery telemetry only; they cannot verify a challenge.
- Monitor delivery acceptance, delivery failure, verification conversion, abuse/rate-limit events, provider latency and cost per successful verification.
- Never send OTPs from background jobs without an originating user action or explicitly defined security workflow.

## 10. Rollout plan

### Phase A — Architecture (this change)
- Document boundaries, policies, threat controls and API contract.
- No migration, credentials, provider calls, paid activation or production changes.

### Phase B — Local core implementation
- Add policy resolver, code generator, HMAC digest service, repository interface and atomic verification service.
- Add unit tests for expiry, replay, concurrency, attempt exhaustion, cooldown, purpose isolation, destination normalization and enumeration resistance.
- Use fake/in-memory delivery adapters in tests only.

### Phase C — Persistence
- Add Prisma models and migration on a feature branch.
- Review RLS, indexes, retention and transactional semantics.
- Do not apply the migration to production without explicit approval.

### Phase D — Sandbox adapter
- Integrate one provider behind the port using sandbox/test recipients only.
- Credentials remain absent until separately approved and supplied.
- No paid message is sent during architecture or local-core work.

### Phase E — Controlled production activation
- Requires explicit approval, confirmed provider pricing, consent copy, operational limits, secret management, monitoring and an end-to-end acceptance test.
- No production activation is implied by this document.

## 11. Acceptance criteria before production

- Provider can be replaced without changing OTP domain logic.
- No provider credential or OTP appears in client bundles, database plaintext fields, logs or traces.
- Expired, replayed, wrong-purpose and over-attempt codes are rejected.
- Concurrent verification requests can consume a challenge only once.
- Rate limits and cooldowns are enforced atomically or by a reliable shared limiter.
- User consent controls channel selection and paid fallback.
- Existing email verification continues to work independently.
- Production rollout is blocked until migration, security review, delivery tests, privacy review and explicit approval are complete.
