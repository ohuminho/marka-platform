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
