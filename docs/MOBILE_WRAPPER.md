# Mobile Wrapper (Capacitor)

This project uses Capacitor to package the web build as native Android/iOS apps.

## Prerequisites

- Node.js 20+
- Android Studio + Android SDK (Android)
- Java 17 (Android)
- Xcode + CocoaPods (iOS)

## One-time setup

```bash
npm install
```

## Build + sync web assets

```bash
npm run cap:sync
```

## Android

```bash
npm run cap:android
```

This opens Android Studio. From there:

1. Select a device or emulator.
2. Use **Run** to build and install.
3. For release builds, configure signing in `android/app/build.gradle` and build a signed APK/AAB.

## iOS

```bash
npm run cap:ios
```

This opens Xcode. From there:

1. Select a device or simulator.
2. Use **Run** to build and install.
3. For release builds, set a team and signing profile in **Signing & Capabilities**.

## Notes

- The app id and name are defined in `capacitor.config.json`. Update those before publishing.
- If the web wrapper changes, re-run `npm run cap:sync` to refresh native assets.
