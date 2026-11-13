# MARKA OTP Core — MIMO first

## Security policy
- Six-digit cryptographically random code; 10-minute expiry; single use.
- 2-minute resend cooldown; maximum 2 resends per challenge.
- Maximum 5 incorrect attempts per challenge.
- Maximum 3 sends per phone and 10 sends per IP per rolling hour.
- Default monthly SMS budget: AOA 15,000. Paid sends must stop at the cap.
- Existing email authentication and sessions remain independent and unchanged.

## Provider
MARKA generates, hashes, validates and expires OTP codes. MIMO Verify is only the SMS transport. The adapter fails closed until MIMO/Backbone confirms the exact authentication header and response contract. Never guess authentication.

## Server-only environment variables
- PHONE_OTP_PEPPER (32+ random characters)
- MIMO_VERIFY_API_KEY
- MIMO_VERIFY_AUTH_HEADER_NAME
- MIMO_VERIFY_AUTH_HEADER_VALUE (may contain {API_KEY})
- Optional MIMO_VERIFY_BASE_URL (defaults to https://verify.mimo.ao)
- Optional PHONE_OTP_MONTHLY_BUDGET_AOA (default 15000)
- Optional PHONE_OTP_MAX_SENDS_PER_PHONE_PER_HOUR (default 3)
- Optional PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR (default 10)

No secrets belong in Git or browser variables. No real SMS is sent until credentials, provider contract, budget and a controlled test are approved.

## Release gates
Validate the migration on an isolated database; implement persistent issue/resend/atomic verification and circuit breaker; integrate registration, phone change and recovery without changing email auth; run auth regression tests and production build; then approve a controlled live SMS test.
