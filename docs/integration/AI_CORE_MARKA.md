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

AI model inference may incur provider charges. Do not enable unrestricted production traffic without a model choice, usage budget, and rate/quotas policy.
