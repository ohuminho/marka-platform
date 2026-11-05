# MARKA Communications — TURN deployment and production gate

The application uses browser-native WebRTC for 1:1 media and authenticated application APIs for signalling. The application does not record audio or video.

## Verified deployment status — 2026-11-05

Repository and connected project checks:

- The call-session migration `20261030150000_add_communication_call_sessions` and shared-context migration `20261030160000_add_shared_context_communication_threads` are present in the Supabase project's applied migration history.
- The database exposes `CommunicationCallSession`, `CommunicationCallSignal`, `CommunicationThread` and `CommunicationThreadParticipant`; RLS is enabled on these tables.
- The MARKA production project's Vercel environment-variable inventory does not currently contain `MARKA_TURN_URLS` or `MARKA_TURN_SHARED_SECRET`.
- The ICE configuration route therefore intentionally returns HTTP 503 in production until TURN is configured. Do not bypass this guard or silently ship STUN-only production calling.
- Repository code contains the authenticated call lifecycle, WebRTC signalling and browser call controls. This is not evidence of successful end-to-end media connectivity.

### Remaining work before release

1. Provision a Coturn host with a public static IP, DNS name and TLS certificate. Prefer a low-cost/self-managed host only after checking bandwidth, UDP availability, firewall policy and monthly egress cost.
2. Configure the exact same high-entropy REST shared secret on Coturn and the MARKA server environment. Store it only as a server-side encrypted/sensitive variable. Never use a `NEXT_PUBLIC_` name.
3. Set `MARKA_TURN_URLS` to the reachable UDP and TLS endpoints; set `MARKA_STUN_URLS` only if a deliberate STUN configuration is required.
4. Redeploy a non-production environment first and verify that the authenticated ICE endpoint returns time-limited credentials without exposing the shared secret.
5. Test two real MARKA accounts on separate Android devices and independent networks (Wi-Fi to mobile data and mobile data to mobile data). Verify that TURN relay is actually selected for a forced-relay test.
6. Test call authorization, expiry, denied permissions, incoming call, reject, hang-up from either side, network interruption/reconnect, and cleanup of expired signalling records.
7. Review mobile background behaviour: browser polling is not a substitute for push delivery and may be suspended by Android when the app/browser is backgrounded.
8. Only enable calling for the tested contexts after the security, privacy, capacity and operational gates pass.

No TURN host was provisioned and no production environment variable was changed during this audit. Do not mark calling production-ready until the above tests pass.

## Required production environment

Configure these variables on the server deployment (never expose the shared secret as a NEXT_PUBLIC variable):

- `MARKA_STUN_URLS`: comma-separated STUN URLs; optional, defaults to Google's public STUN endpoint.
- `MARKA_TURN_URLS`: comma-separated TURN URLs, including UDP and preferably TURN/TLS endpoints, e.g. `turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp`.
- `MARKA_TURN_SHARED_SECRET`: long random secret shared with Coturn's `use-auth-secret` / `static-auth-secret` configuration.

The authenticated ICE configuration endpoint issues time-limited TURN credentials using Coturn's REST-style HMAC-SHA1 credential scheme. Credentials expire after one hour and are scoped to the authenticated user identifier. Do not place the shared secret in browser code, client environment variables, logs, or source control.

## Coturn baseline

Use a maintained Coturn release on a dedicated Linux host or managed VM. Configure TLS certificates, a restricted relay port range, firewall rules for the chosen UDP/TCP/TLS ports, `use-auth-secret`, `static-auth-secret`, and a public DNS name. Set realistic relay bandwidth and connection limits. Monitor allocation failures, relay traffic, CPU, memory and network egress.

## Release gates (mandatory)

1. Apply the Prisma migration and regenerate Prisma Client.
2. Configure TURN and verify time-limited credentials against the Coturn secret.
3. Test audio and video between two real MARKA accounts on separate Android devices and independent networks, including mobile carrier NAT.
4. Verify denied microphone/camera permissions, incoming call rejection, missed/expired calls, hang-up from either side, reconnect, and unauthorized signalling.
5. Confirm no SDP, ICE candidates, credentials or media are written to application logs.
6. Load-test signalling and TURN relay capacity before enabling calls globally.

Open-source software removes licence fees; it does not remove VM, bandwidth, egress, DNS or operational costs. Do not advertise production calling availability until the above gates pass.
