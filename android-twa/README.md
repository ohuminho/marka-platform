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

The GitHub Actions workflow `.github/workflows/android-twa-validation.yml` performs source-level checks for the PWA manifest, required icon files and SVG viewBoxes, the navigation-only offline fallback, and the offline page. The general MARKA CI separately runs lint, unit tests, and the Next.js production build.

**Important:** the automated workflow does not run Bubblewrap's live-site validator, does not inspect the deployed website, and does not verify Digital Asset Links. After the production deployment is READY, run the additional TWA validation from an environment with Node.js, Java and the Android tooling installed:

```bash
bubblewrap validate --url=https://markaao.com
```

A remote PageSpeed/Google API quota or rate-limit response is not proof of a PWA defect; inspect the actual validation findings and retry when the external service permits.

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

1. Source-level PWA checks and the general MARKA CI pass.
2. Bubblewrap's live-site quality validation passes against the release origin.
3. Android project builds a signed AAB and the package ID is confirmed.
4. Digital Asset Links is live and verified against the Play App Signing certificate.
5. Physical-device QA covers login/session persistence, location permissions, maps, Mobility, Marketplace, deep links, back navigation, external links, uploads, notifications (if enabled), and small/large/foldable screens.
6. Play Console listing, privacy policy, Data safety, content rating, target API, screenshots, and testing track requirements are complete.

This configuration and workflow are preparation, not a claim that an AAB has already been signed, tested on physical devices, or accepted by Google Play.
