# MARKA Communications — TURN deployment and production gate

The application uses browser-native WebRTC for 1:1 media and authenticated application APIs for signalling. The application does not record audio or video.

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
