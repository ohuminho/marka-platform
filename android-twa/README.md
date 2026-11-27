# MARKA Android / Google Play preparation

This directory is the source-of-truth configuration for packaging the existing MARKA
web platform as an Android Trusted Web Activity (TWA). It does not create a second
product, backend, account system, or login. The Android app opens the production
MARKA origin and keeps the existing Next.js application and services.

## Current target

- Application name: MARKA
- Production origin: https://markaao.com
- Launch path: /app
- Android application ID candidate: com.markaao.app
- Packaging: Google Chrome Labs Bubblewrap (TWA)
- Minimum Android API: 23 (Android 6.0)
- Web backend: existing MARKA production backend

The application ID is intended to be stable. Confirm it is available in the MARKA
Google Play developer account before the first Play Console upload; it cannot be
changed after the app is published.

## Build prerequisites

- Node.js LTS
- Java JDK supported by the current Bubblewrap release
- Android SDK / command-line tools
- Bubblewrap CLI: `npm install --global @bubblewrap/cli`
- The MARKA Android upload/signing keystore, stored outside Git

## Generate and build

Run from this directory after the production PWA passes Bubblewrap validation:

```bash
bubblewrap doctor
bubblewrap validate --url=https://markaao.com
bubblewrap update --manifest=./twa-manifest.json
bubblewrap build --manifest=./twa-manifest.json
```

Bubblewrap generates the Android Gradle project and an Android App Bundle (AAB).
The signing keystore and passwords must be provided securely at build time. Never
commit keystores, passwords, Play service-account JSON files, or upload credentials.

## Digital Asset Links

A Trusted Web Activity needs a verified relationship between the Android package
and markaao.com. After the final upload certificate SHA-256 fingerprint is known,
publish the generated statement at:

`https://markaao.com/.well-known/assetlinks.json`

For Play App Signing, use the App signing certificate fingerprint shown in Play
Console (and include the upload certificate only if a separate use case requires it).
Do not publish guessed or placeholder fingerprints.

## Release gate

Do not submit to production until all of these are complete:

1. Production PWA validation passes, including manifest, icons, HTTPS, and service
   worker/offline behaviour where applicable.
2. Android project builds a signed AAB and the package ID is confirmed.
3. Digital Asset Links is live and verified against the Play App Signing certificate.
4. Physical-device QA covers login/session persistence, location permissions, maps,
   Mobility, Marketplace, deep links, back navigation, external links, uploads,
   notifications (if enabled), and small/large/foldable screens.
5. Play Console listing, privacy policy, Data safety, content rating, target API,
   screenshots, and testing track requirements are complete.

This is a TWA packaging configuration, not a claim that an AAB has already been
signed, tested on physical devices, or accepted by Google Play.
