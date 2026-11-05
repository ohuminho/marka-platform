# MARKA Communications — TURN deployment and production gate

The application uses browser-native WebRTC for 1:1 media and authenticated application APIs for signalling. The application does not record audio or video.

## Verified deployment status — 2026-11-05

Repository and connected project checks:

- The call-session migration `20261030150000_add_communication_call_sessions` and shared-context migration `20261030160000_add_shared_context_communication_threads` are present in the Supabase project's applied migration history.
- The database exposes `CommunicationCallSession`, `CommunicationCallSignal`, `CommunicationThread` and `CommunicationThreadParticipant`; RLS is enabled on these tables.
- The MARKA production project's Vercel environment-variable inventory did not contain Coturn TURN variables during the last audit.
- The ICE configuration route intentionally returns HTTP 503 in production until a TURN provider is configured. Do not bypass this guard or silently ship STUN-only production calling.
- Repository code contains the authenticated call lifecycle, WebRTC signalling and browser call controls. This is not evidence of successful end-to-end media connectivity.

## Provider options

### Preferred no-VPS trial: Cloudflare Realtime TURN

Cloudflare's current documentation describes a 1,000 GB/month free allowance shared by Realtime TURN and SFU, followed by US$0.05 per GB of billable egress. TURN used with Cloudflare Realtime SFU/Stream has separate internal billing treatment; MARKA's 1:1 peer-to-peer use should not assume that exemption.

Official references:
- https://developers.cloudflare.com/realtime/turn/
- https://developers.cloudflare.com/realtime/turn/faq/
- https://developers.cloudflare.com/realtime/turn/generate-credentials/

Create a TURN key and a scoped API token with the required Calls Write permission. Keep both values server-side. The API token is used by MARKA's backend to request one-hour credentials from Cloudflare; it must never be returned to a browser or committed to source control.

Server environment:
- `MARKA_CLOUDFLARE_TURN_KEY_ID`: Cloudflare TURN key ID.
- `MARKA_CLOUDFLARE_TURN_API_TOKEN`: secret API token associated with that TURN key.

The application endpoint requests credentials with a 3,600-second TTL and returns the resulting ICE server list to an authenticated, active MARKA user. The provider response is not cached. A provider error fails closed with HTTP 503; it must not silently fall back to STUN-only calling in production.

**Cost guard:** the free allowance is not a hard spending cap. Before enabling this provider in production, configure Cloudflare billing alerts and account-level controls where available, monitor usage, and agree a maximum spend. Do not add a payment method or enable paid usage without explicit owner approval. If Cloudflare cannot enforce a hard zero-spend cap, treat this as a controlled test only and stop before the free allowance is exhausted.

### Self-hosted alternative: Coturn

Coturn remains supported as a separate provider mode:
- `MARKA_TURN_URLS`: comma-separated TURN URLs.
- `MARKA_TURN_SHARED_SECRET`: long random REST shared secret, shared with Coturn's `use-auth-secret` / `static-auth-secret` configuration.
- `MARKA_STUN_URLS`: optional comma-separated STUN URLs; defaults to Google's public STUN endpoint.

Coturn requires a Linux host with public IP, UDP/TCP reachability, TLS certificate, DNS, firewall configuration and bandwidth. Open-source software removes licence fees, not infrastructure or network costs.

### Metered Open Relay

Metered may be evaluated as a secondary trial option. Verify its current free quota, overage policy, supported protocols and account billing controls directly before configuring it. Do not rely on older third-party references for current pricing.

## Remaining work before release

1. Create the Cloudflare TURN key and scoped API token only after confirming account ownership and billing safeguards.
2. Add the two Cloudflare environment variables to a non-production Vercel environment; never use a `NEXT_PUBLIC_` name.
3. Deploy a preview and verify that the authenticated ICE endpoint returns time-limited credentials without exposing the API token or TURN key.
4. Test two real MARKA accounts on separate Android devices and independent networks (Wi-Fi to mobile data and mobile data to mobile data). Verify TURN relay is actually selected for a forced-relay test.
5. Test call authorization, expiry, denied permissions, incoming call, reject, hang-up from either side, network interruption/reconnect, and cleanup of expired signalling records.
6. Review mobile background behaviour: browser polling is not a substitute for push delivery and may be suspended by Android when the app/browser is backgrounded.
7. Monitor actual relayed GB, call duration, failure rate and latency before any wider rollout.
8. Only enable calling for tested contexts after security, privacy, capacity and cost gates pass.

No TURN provider credentials were provisioned and no production environment variable was changed during this implementation. Do not mark calling production-ready until the above tests pass.

## Security requirements

- Keep provider keys only in server-side encrypted environment variables.
- Issue short-lived credentials only to authenticated active users.
- Never log provider tokens, TURN credentials, SDP or ICE candidates.
- Use private, no-store responses for ICE configuration.
- Rate-limit credential issuance and monitor abuse before broad rollout.
- Fail closed when a configured provider is incomplete or unavailable.

## Release gates (mandatory)

1. Configure a TURN provider in a non-production environment.
2. Verify time-limited credentials and prove that secrets are absent from browser payloads and logs.
3. Test audio and video between two real MARKA accounts on separate Android devices and independent networks, including mobile carrier NAT.
4. Verify denied microphone/camera permissions, incoming call rejection, missed/expired calls, hang-up from either side, reconnect and unauthorized signalling.
5. Confirm no SDP, ICE candidates, credentials or media are written to application logs.
6. Confirm the account's billing controls and agreed cost ceiling before enabling any paid overage.
7. Load-test signalling and TURN relay capacity before enabling calls globally.

Do not advertise production calling availability until all release gates pass.
