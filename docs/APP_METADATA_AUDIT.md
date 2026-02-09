# App Metadata Audit

Audit date: 2026-02-09  
Scope: Android, iOS, Windows desktop wrapper, web/remake versions.

## Canonical Values

- Product name: `Tanks`
- App ID / bundle ID: `com.prekzursil.tanks`
- Marketing version: `0.1.0` (from `VERSION`)

## Android

Checked files:

- `android/app/build.gradle`
- `android/app/src/main/res/values/strings.xml`
- `capacitor.config.json`

Findings:

- `applicationId` is `com.prekzursil.tanks` (aligned).
- `versionName` is `0.1.0` and `versionCode` is `1` (aligned for current release).
- App display strings are `Tanks` (aligned).
- Orientation config in activity allows portrait + landscape via Capacitor defaults.

Status: PASS

## iOS

Checked files:

- `ios/App/App/Info.plist`
- `ios/App/App.xcodeproj/project.pbxproj`

Findings:

- `PRODUCT_BUNDLE_IDENTIFIER` is `com.prekzursil.tanks` (aligned).
- `MARKETING_VERSION` is `0.1.0` and `CURRENT_PROJECT_VERSION` is `1` (aligned).
- Display name is `Tanks` (aligned).
- Supported orientations include portrait and landscape (phone + iPad entries present).

Status: PASS

## Windows (Electron)

Checked files:

- `apps/desktop/package.json`
- `apps/desktop/build/icon.ico`

Findings:

- `build.appId` is `com.prekzursil.tanks` (aligned).
- `productName` is `Tanks` (aligned).
- Version is `0.1.0` (aligned with repo version sync).
- Icon configured via `build/icon.ico`.

Status: PASS

## Web and Remake Web

Checked files:

- `apps/web/package.json`
- `apps/remake-web/package.json`
- `VERSION`

Findings:

- All versions read `0.1.0` (aligned).
- UI surfaces version through Vite define hook in remake/web projects.

Status: PASS

## Notes

- Windows code signing certificate remains optional/unresolved TODO.
- Before each release tag, run version sync and re-run this audit quickly:
  - `npm run sync:versions`
  - verify `VERSION` equals the release tag version.
