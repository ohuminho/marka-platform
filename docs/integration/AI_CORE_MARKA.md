# MARKA AI — shared AI Core integration

MARKA uses the shared MARKA × ZION AI Core through a server-side Next.js route. The browser never receives AI Core credentials or the HMAC signing secret.

## Request flow

`MARKA browser → POST /api/ai/chat → MARKA session validation → signed product context → AI Core /api/v1/ai/generate`

- Route: `POST /api/ai/chat`
- Authentication: HttpOnly MARKA session cookie.
- Tenant isolation: each authenticated MARKA user receives a private tenant scope derived from the validated session user ID.
- AI space: `marka`.
- Context issuer: `marka-api`.
- Context audience: `ai-core`.
- Upstream: `POST https://marka-zion-ai-core.vercel.app/api/v1/ai/generate`.
- Secrets: `AI_CORE_API_KEY` and `AI_CONTEXT_SIGNING_SECRET`, server-side only.

## Production environment

Set these variables on the MARKA Vercel project for Production:

- `AI_CORE_BASE_URL`
- `AI_CORE_API_KEY`
- `AI_CONTEXT_SIGNING_SECRET`
- `AI_CORE_VERCEL_BYPASS` (server-only; bypasses Vercel SSO protection on the AI Core deployment)
- `AI_CORE_SPACE=marka`
- `AI_CONTEXT_ISSUER=marka-api`
- `AI_CONTEXT_AUDIENCE=ai-core`

The AI Core project must allow `marka-api` in `AI_ALLOWED_CONTEXT_ISSUERS` and use the same audience and shared secrets. Because the AI Core deployment is protected by Vercel SSO, the server-side request also sends `x-vercel-protection-bypass`; the bypass secret must never reach the browser.

## API contract

Request:

```json
{
  "prompt": "A pergunta do utilizador",
  "conversationId": "optional-conversation-id"
}
```

Successful response:

```json
{
  "success": true,
  "requestId": "request-id",
  "content": "Resposta gerada pela IA",
  "provider": "provider/model",
  "model": "model-id",
  "correlationId": "correlation-id"
}
```

The route enforces active account status, input length limits, a 30-second upstream timeout, HTTPS in production, no-store responses, and bounded upstream response size. It does not accept tenant IDs, roles, or access levels from the browser.

## Data boundaries

The AI Core never connects directly to MARKA's PostgreSQL database. It receives only the user-scoped prompt and signed context. Product-specific data must be retrieved through explicitly authorized MARKA APIs/tools; it must not be inferred or fabricated by the model.

The MARKA AI Core is a MARKA-owned platform component and remains the authoritative intelligence layer for MARKA. Its internal model/runtime configuration is managed by the MARKA team; this integration must not introduce a new external AI subscription or replace the owned AI Core. Before opening high-volume public traffic, keep rate limits, abuse protection, observability and operational capacity controls in place.


## MARKA-side quota and usage governance

The MARKA gateway applies a database-backed quota before forwarding chat requests:

- Standard active accounts: 12 requests per minute and 120 requests per 24 hours.
- Founder, ADMIN, SUPER_ADMIN and SYSTEM_ADMIN accounts: exempt from the MARKA-side per-user quota. Exemption is decided from the active user record after session validation; browser-supplied roles are ignored.
- Requests are recorded in `SecurityEvent` as `AI_CORE_USAGE` after a successful response. Only model/provider identifiers, token counts, request correlation and duration are stored; prompts and generated text are not persisted by this usage recorder.
- Rate-limit counters use transaction advisory locks and the existing PostgreSQL `SecurityEvent` table. No new paid service or database migration is required.

The shared AI Core currently enforces 30 requests/minute and 500,000 tokens/day per tenant and at platform level for standard contexts. A companion change is staged in AI Core PR #5: trusted signed `OWNER` contexts from the allowlisted `marka-api` issuer bypass both per-tenant and platform-wide request/token quotas. Usage audit events remain enabled, and sensitive writes still require human approval. This exemption becomes effective only after AI Core PR #5 is merged/deployed and the production `AI_OWNER_CONTEXT_ISSUERS` allowlist includes `marka-api`.

## Usage analytics

The protected MARKA admin endpoint `GET /api/admin/growth/analytics` aggregates consented growth events and AI Core usage for the last 30 days. The admin page is `/app/admin/growth`. It deliberately does not report sign-ups or purchases until those metrics are connected to authoritative server-side account and confirmed-payment events. Cart-to-purchase conversion remains unavailable rather than being fabricated.
