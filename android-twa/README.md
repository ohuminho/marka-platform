# MARKA Android / Google Play preparation

This directory contains the source configuration and release procedure for packaging the existing MARKA web platform as an Android Trusted Web Activity (TWA). It does not create a second product, backend, account system, or login. The Android app opens the production MARKA origin and keeps the existing Next.js application and services.

## Current target

- Application name: MARKA
- Production origin: https://markaao.com
- Launch path: /app
- Android application ID candidate: com.markaao.app
- Packaging: Google Chrome Labs Bubblewrap (TWA)
- Minimum Android API: 23 (Android 6.0)
- Web backend: existing MARKA production backend

The application ID is intended to be stable. Confirm it is available in the MARKA Google Play developer account before the first Play Console upload; it cannot be changed after the app is published.

## Build prerequisites

- Node.js 18 or newer
- Java JDK 17
- Android SDK / command-line tools
- Bubblewrap CLI: `npm install --global @bubblewrap/cli`
- A protected Android signing keystore, stored outside Git

## PWA validation

Run Bubblewrap's TWA quality validation against the production website:

```bash
bubblewrap validate --url=https://markaao.com
```

The GitHub Actions workflow `.github/workflows/android-twa-validation.yml` runs this validation on relevant pull requests and on changes to the Android/PWA configuration in `main`. Pull-request validation targets the Vercel preview; main-branch validation targets production.

## Generate the Android project

Generate the native Android project from the live MARKA Web Manifest:

```bash
bubblewrap init --manifest=https://markaao.com/manifest.webmanifest --directory=android-twa
```

During initialization, confirm:
- Package ID: `com.markaao.app` (only after checking it is unused in the Play Console account).
- App name and launcher name: `MARKA`.
- Start URL: `/app`.
- Orientation: `default` (do not lock to portrait).
- Signing key path and alias: use a protected key outside the repository.

Review the generated `android-twa/twa-manifest.json` against the tracked baseline configuration in this directory before building. Do not overwrite the generated Android project with manual Gradle edits; use Bubblewrap's manifest and `update` command for supported changes.

## Build and test

From the repository root:

```bash
bubblewrap build --manifest=android-twa
```

Bubblewrap generates a signed APK for device testing and an Android App Bundle (AAB) for Play Console upload. The signing keystore and passwords must be provided securely. For a diagnostic build only, `--skipSigning` can be used, but an unsigned AAB is not suitable for Play Store release.

## Digital Asset Links

A Trusted Web Activity needs a verified relationship between the Android package and markaao.com. After the final Play App Signing certificate SHA-256 fingerprint is known, publish the generated statement at:

`https://markaao.com/.well-known/assetlinks.json`

Use the App signing certificate fingerprint shown in Play Console when Play App Signing is enabled. Never publish guessed or placeholder fingerprints.

## Release gate

Do not submit to production until all of these are complete:

1. Bubblewrap PWA quality validation passes against the release origin.
2. Android project builds a signed AAB and the package ID is confirmed.
3. Digital Asset Links is live and verified against the Play App Signing certificate.
4. Physical-device QA covers login/session persistence, location permissions, maps, Mobility, Marketplace, deep links, back navigation, external links, uploads, notifications (if enabled), and small/large/foldable screens.
5. Play Console listing, privacy policy, Data safety, content rating, target API, screenshots, and testing track requirements are complete.

This configuration and workflow are preparation, not a claim that an AAB has already been signed, tested on physical devices, or accepted by Google Play.
