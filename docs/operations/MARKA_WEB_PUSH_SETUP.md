# MARKA Web Push — deployment and verification

This feature uses the browser's standards-based Web Push protocol. MARKA does not depend on a paid push gateway. Browser vendors still operate their own push services; delivery depends on browser, operating-system, network, and user permission.

## 1. Generate VAPID credentials

Generate a fresh P-256 key pair on a trusted operator machine:

```bash
node -e 'const {createECDH}=require("node:crypto");const e=createECDH("prime256v1");e.generateKeys();console.log("MARKA_VAPID_PUBLIC_KEY="+e.getPublicKey("base64url"));console.log("MARKA_VAPID_PRIVATE_KEY="+e.getPrivateKey("base64url"));'
```

Store the output in the deployment secret manager. Never commit either value. The public key is returned only by the authenticated subscription configuration endpoint; the private key must remain server-side.

Set:

- `MARKA_VAPID_PUBLIC_KEY`
- `MARKA_VAPID_PRIVATE_KEY`
- `MARKA_VAPID_SUBJECT` — a monitored `mailto:` address or HTTPS contact URL, e.g. `mailto:support@markaao.com`

The public and private keys must be generated together. The server checks that they match before signing a push request.

## 2. Database migration

After the pull request is reviewed and merged, apply the migration using the repository's approved deployment process:

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not use `prisma db push` in production. The migration enables row-level security and revokes direct `anon` and `authenticated` access to push subscription records. Server-side Prisma access remains the application path.

## 3. User consent and device registration

- Sign in to MARKA over HTTPS on Android Chrome.
- Open the app and explicitly select **Activar alertas**.
- Grant the browser notification permission.
- Verify that the device appears as subscribed in `GET /api/comms/push-subscriptions`.
- Use the same control to revoke the device subscription. Browser permission may also be revoked in Android/Chrome settings.

The application must not request notification permission on page load.

## 4. Acceptance tests

Use two independent Android devices and different networks:

1. Device A signs in and enables push notifications.
2. Device B signs in and starts an audio call to A.
3. Put A's MARKA PWA in the background and lock the screen; verify the OS notification arrives.
4. Tap the notification and verify MARKA opens the correct conversation/thread.
5. Repeat with video call, rejected call, and missed call.
6. Disable push on A and verify subsequent calls no longer notify that device.
7. Revoke notification permission at OS/browser level and verify the app does not silently re-enable it.
8. Test a stale subscription response (404/410) and verify it is revoked server-side.

Web Push notifications are not a substitute for a native full-screen call service. Android may display the incoming-call notification while the PWA is backgrounded, but the user still needs to open MARKA and accept the call. Reliable ringing/audio while the app is terminated requires additional native Android integration and separate device testing.

## 5. Operational limits

- At most five active device subscriptions are attempted per user in one delivery.
- Push payloads contain minimal call metadata and an internal relative URL only.
- SDP and ICE signalling are never included in push payloads.
- Failed push delivery does not fail or roll back call creation.
- Browser push delivery is best-effort; the persistent MARKA notification inbox remains the source of truth.
