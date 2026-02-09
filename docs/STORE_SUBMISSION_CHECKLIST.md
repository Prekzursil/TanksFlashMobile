# Store Submission Checklist

This checklist covers release readiness for:

- Google Play Store (Android)
- Apple App Store (iOS)

Project context:

- App name: `Tanks`
- Bundle/App ID: `com.prekzursil.tanks`
- Current version source of truth: `VERSION`

## 1) Accounts and Access

- Google Play Console account created and verified.
- Apple Developer Program membership active.
- Team roles assigned for release/signing access.

## 2) Signing and Build Credentials

### Android

- Keystore generated and stored securely.
- CI secrets configured (already supported by workflow):
  - `ANDROID_KEYSTORE_B64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Release artifacts confirmed:
  - signed `.apk` and `.aab` on tag builds when secrets are present.

### iOS

- Distribution certificate + private key available in Apple team.
- App Store Connect provisioning profile configured for `com.prekzursil.tanks`.
- Xcode signing team/config set for release archive.
- TestFlight upload path validated locally or in CI macOS pipeline.

## 3) App Metadata

- App name is consistent (`Tanks`) across:
  - Android strings/resources
  - iOS display name
  - desktop metadata
- Version aligned to `VERSION` and synced into platform projects.
- App description, keywords, category, and support URL prepared.
- Copyright/ownership text finalized.

## 4) Assets (Store Listing)

- App icon uploaded for each store.
- Feature graphic (Play Store) prepared.
- Screenshots captured for:
  - phone portrait
  - phone landscape
  - tablet (recommended)
- Optional preview video prepared.

## 5) Privacy and Policies

- Privacy policy URL publicly reachable (HTTPS).
- Data Safety form (Google Play) completed.
- App Privacy (Apple) completed.
- Contact/support URL and support email active.

## 6) Technical Compliance

### Android

- `targetSdkVersion` up to date per Play requirements.
- AAB upload validated.
- Play pre-launch report reviewed for crashes/ANRs.

### iOS

- Archive passes App Store validation in Xcode.
- No private API usage.
- Required Info.plist usage descriptions present (if APIs are added later).

## 7) QA and Release Ops

- Smoke tests pass on release commit.
- Real device sanity test on at least:
  - 1 Android phone
  - 1 iPhone
- Crash-free first launch and gameplay start verified.
- Release notes drafted for first public version.

## 8) Go/No-Go Gate

- Build signed
- Metadata complete
- Privacy/support links live
- Screenshots complete
- Device QA pass
- Rollout plan defined (staged/full)

When all items above are checked, proceed with store submission.
