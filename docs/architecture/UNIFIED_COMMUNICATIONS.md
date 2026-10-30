# MARKA Unified Communications — Architecture Decision

Status: Accepted architecture; implementation is staged.
Date: 2026-10-30

## Product decision

MARKA will provide one first-party communications system shared by Marketplace, Mobility and Delivery. A user has one inbox and one identity; the business context determines who may contact whom and when. Do not create separate chat or call stacks for each vertical.

## Scope and access rules

- Marketplace: buyer and the owner/operator of the relevant store may message. Voice/video calling is available only inside an existing, participant-authorized conversation.
- Mobility: rider and the assigned driver may message and call only after a ride is matched/assigned. Access is revoked when the ride is cancelled, expires or reaches its terminal state, subject to a short post-trip support window defined by product policy.
- Delivery: customer, merchant and assigned courier may communicate only when they are participants in the same fulfillment. Do not expose personal phone numbers.
- Admin/support access is not implicit. Any exceptional access must be permissioned, purpose-limited and audit logged.

## Calling technology

Use browser-native WebRTC for 1:1 audio/video. It provides DTLS-SRTP media encryption and avoids introducing a paid calling SDK or a proprietary lock-in. Use:
1. Authenticated application API for call authorization and signalling.
2. STUN for connectivity discovery.
3. A self-hostable TURN service (coturn) for restrictive NAT/mobile networks and relay fallback.
4. Explicit microphone/camera permission, device selection, mute, camera toggle, speaker route where supported, hang-up, incoming-call screen, missed-call state and network/reconnect feedback.

Do not rely on public STUN alone for production. P2P direct media is inexpensive, but some mobile/carrier networks require TURN; relay bandwidth and server capacity must be budgeted. For group calls or high concurrency, evaluate an SFU such as self-hosted LiveKit rather than mesh WebRTC.

## Security and privacy

- Authenticate every signalling request with the existing MARKA session; authorize both participants against the underlying conversation/ride/fulfillment on every operation.
- Never trust participant IDs supplied by the browser.
- Short-lived call invitations, one active call per conversation context, idempotent state transitions, expiry and rate limits.
- Do not store audio/video recordings by default. No recording without explicit, legally valid consent and a separate retention policy.
- Do not put SDP, ICE candidates, access tokens or credentials in application logs.
- Validate message content server-side; block external contact exchange, off-platform payment diversion and credential sharing, with abuse reporting and human review.
- Keep chat/call event metadata minimal and define retention/deletion rules.
- Use HTTPS/WSS in production; apply CSRF/origin protections to cookie-authenticated signalling routes.

## UX

- Shared inbox and conversation view across Marketplace, Mobility and Delivery, with clear context labels (product, order, ride or delivery).
- In-app voice and video buttons appear only when the context is eligible.
- Offer audio-only by default on constrained mobile connections; let users opt into video.
- Show clear call states: ringing, connecting, active, reconnecting, ended, missed and failed.
- No automatic camera activation. User must explicitly accept an incoming call and grant device permission.

## Delivery sequence / release gates

1. Harden shared conversation authorization and content moderation.
2. Implement persistent call-session lifecycle and authenticated signalling API.
3. Implement WebRTC 1:1 audio first; add TURN and test carrier/NAT cases.
4. Add video, device controls, call history and missed-call notifications.
5. Connect Mobility ride and Delivery fulfillment contexts using the same service.
6. Add abuse controls, operational metrics, load tests and security review.

Release gate: do not label calls production-ready until tested between two real accounts on separate devices and networks (including mobile data), with permissions denied/granted, reconnect, hang-up, unauthorized participant, expired ride/conversation and TURN relay scenarios.

## Implementation status — 2026-10-30

The first Marketplace calling slice is now present in the repository:

- Prisma persistence for 1:1 call sessions and short-lived WebRTC signalling records.
- Authenticated call creation/listing, accept/reject/end lifecycle and participant-scoped offer/answer/ICE exchange.
- Per-conversation PostgreSQL advisory locking to prevent concurrent ringing sessions.
- Server-issued, one-hour Coturn REST credentials derived from `MARKA_TURN_SHARED_SECRET`; the shared secret is never sent to the browser.
- Marketplace inbox controls for audio/video, incoming calls, accept/reject, mute, camera toggle and hang-up.
- Shared context-thread persistence for Mobility rides and Delivery fulfillments, with participant membership derived from live ride/fulfillment assignment data.
- Context-authorized message APIs and shared inbox aggregation across Marketplace, Mobility and Delivery.
- Private Mobility communication entry point from the active-trip workspace and Delivery communication entry point from order details.
- Global authenticated incoming-call alert across the MARKA application shell, with a secure handoff into the correct conversation.
- 1:1 calls in Mobility/Delivery contexts, with recipient selection when a fulfillment thread contains multiple participants.
- Authorization revalidation on every thread read, message send, call lifecycle operation and WebRTC signalling request. Participant membership synchronization avoids repeated database writes on polling.
- Operational runbook: `docs/operations/COMMUNICATIONS_TURN_DEPLOYMENT.md`.

This is an implementation milestone, not a production certification. The following remain release blockers:

1. Apply migration `20261030150000_add_communication_call_sessions` to the target database and regenerate Prisma Client.
2. Configure a real Coturn endpoint and server-only shared secret in the production environment. The ICE endpoint deliberately returns HTTP 503 in production when TURN is absent; it does not silently fall back to STUN-only calling.
3. Complete successful GitHub CI, two-device Android/browser testing across independent networks, mobile-carrier NAT/TURN relay tests, permission-denial tests and unauthorized-participant tests.
4. Extend the same authorization and conversation model to Mobility rides and Delivery fulfillments before enabling calling in those verticals.
5. Add durable incoming-call push delivery, operational rate limiting, retention cleanup for expired SDP/ICE records and abuse monitoring.

Do not expose the call controls as globally production-ready until these gates are met.
