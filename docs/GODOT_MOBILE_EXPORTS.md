# Godot Mobile Exports (Android/iOS)

This repo includes a Godot remake prototype at:

- `apps/remake-godot/`

The project includes **Android** and **iOS** export presets in:

- `apps/remake-godot/export_presets.cfg`

These presets are intentionally minimal and are meant as a starting point. You will still need to configure platform
SDKs and signing in the Godot editor / Xcode.

## Prerequisites

- Godot **4.2.2** (recommended to match CI / export templates).
- Export templates installed (Godot will prompt you, or use: Editor → Manage Export Templates).

Android:
- Android Studio + Android SDK
- Java 17
- (For Play Store) a signing keystore (`.jks`) you control

iOS:
- macOS + Xcode
- (For device/TestFlight) an Apple Developer account and signing configured in Xcode

## Android (device + Play Store)

1. Open `apps/remake-godot/project.godot` in the Godot editor.
2. Go to Project → Export.
3. Select the `Android` preset.
4. Configure Android SDK paths in Editor Settings (Export → Android) if Godot reports missing tools.
5. Set the package id (bundle id) to something you own (default in this repo: `com.prekzursil.tanks`).

### Debug build (quick on-device test)

- Export an APK for a connected device.
- Install via `adb` (recommended) or by copying the APK to the device and installing it.

### Play Store build (AAB)

For Play Store you’ll typically upload an **AAB** (Android App Bundle), signed with your release keystore.

Minimum checklist:
- Unique package id
- Version code increments for every upload
- Release keystore configured (do not commit it)
- Store listing: screenshots, description, privacy policy, contact

## iOS (device + TestFlight)

Godot’s iOS export produces an Xcode project that you build/sign in Xcode.

1. Open `apps/remake-godot/project.godot` in Godot.
2. Project → Export.
3. Select the `iOS` preset.
4. Export to an output folder.
5. Open the exported project in Xcode.
6. In Xcode: set a Team in Signing & Capabilities, verify the bundle identifier, then build to a device.

### TestFlight

1. Xcode: Product → Archive.
2. Distribute the archive to App Store Connect (TestFlight).
3. Manage testers in App Store Connect.

## Versioning

This repo keeps a single version in `VERSION` (repo root).

For store builds you’ll also need:
- Android: version name + monotonically increasing version code
- iOS: Marketing Version + Build Number (in Xcode)

If you want strict consistency, wire these to `VERSION` as a follow-up.

## Notes

- CI currently exports **desktop** Godot builds only. Mobile exports depend on local SDK/signing setup.
- Keep keystores, signing passwords, and Apple signing credentials out of git. Prefer local machine setup or CI secrets.

