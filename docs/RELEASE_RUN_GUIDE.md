# Release Artifact Run Guide

This guide explains how to use each artifact produced by tag-based releases.

Release assets are attached to tags such as `v0.1.0`.

## 1) Web (`Tanks-<tag>-web-dist.zip`)

1. Download and unzip `Tanks-<tag>-web-dist.zip`.
2. Serve the extracted directory with a static file server:

```bash
cd <unzipped-web-dist>
python3 -m http.server 8080
```

3. Open `http://127.0.0.1:8080` in a browser.

## 2) Windows

Artifacts:
- `Tanks-<tag>-windows-setup.exe`
- `Tanks-<tag>-windows-portable.zip`

### Installer (`.exe`)
1. Run `Tanks-<tag>-windows-setup.exe`.
2. Complete the setup wizard.
3. Launch the app from Start Menu or desktop shortcut.

### Portable (`.zip`)
1. Unzip `Tanks-<tag>-windows-portable.zip`.
2. Run `Tanks.exe` inside the extracted folder.

Notes:
- Unsigned builds may trigger SmartScreen warnings.
- If a paid OV/EV certificate is configured later, those warnings are reduced.

## 3) Android

Artifacts:
- `Tanks-<tag>-android-debug.apk` (always)
- `Tanks-<tag>-android-release.apk` and `Tanks-<tag>-android-release.aab` (only when signing secrets are set)

### Debug APK install
1. Transfer `Tanks-<tag>-android-debug.apk` to your Android device.
2. Enable install from unknown sources for the file manager/browser you used.
3. Open the APK and install.

### Signed release APK/AAB
- `android-release.apk`: signed installable package (when available).
- `android-release.aab`: Play Store upload package (not installed directly by most users).

## 4) iOS Simulator (`Tanks-<tag>-ios-simulator-app.zip`)

1. On macOS, unzip `Tanks-<tag>-ios-simulator-app.zip`.
2. Boot an iOS Simulator.
3. Install the app bundle:

```bash
xcrun simctl install booted App.app
```

4. Launch it from Simulator.

## 5) iOS free local signed IPA (your own device, free Apple ID)

This path does not require a paid Apple Developer subscription, but has limitations:
- signing is tied to your personal Apple ID and device
- provisioning is short-lived
- not suitable for public distribution or TestFlight

### Prerequisites
- macOS with Xcode
- free Apple ID signed into Xcode
- iPhone/iPad connected to your Mac

### Build and sign
1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select target `App` and set:
   - a unique bundle identifier
   - Team = your personal Apple ID
   - Signing = Automatically manage signing
3. Select your connected device and run once to confirm signing works.
4. Archive from Xcode (`Product` -> `Archive`).
5. In Organizer, export a development-signed `.ipa` if available for your account/device setup.

If Organizer export is blocked for your free account, continue using direct Xcode run/install on your device.

### Attach local IPA to GitHub Release
After exporting locally, upload it to the existing tag release:

```bash
gh release upload v0.1.0 /absolute/path/to/Tanks-v0.1.0-ios-local-signed.ipa --clobber
```

## 6) Verify checksums

Releases include `SHA256SUMS.txt` for artifact integrity verification.

### Verification steps

1. Download `SHA256SUMS.txt` from the release.
2. Download one or more artifact files (e.g., `Tanks-<tag>-web-dist.zip`).
3. Place all downloads in the same directory.
4. Run the verification command:

```bash
sha256sum -c SHA256SUMS.txt
```

Expected output for successfully verified files:
```
Tanks-v0.1.0-web-dist.zip: OK
Tanks-v0.1.0-windows-setup.exe: OK
```

If a file has been tampered with or corrupted, you'll see `FAILED` instead of `OK`.

### Platform-specific checksum commands

- **Linux/macOS**: `sha256sum -c SHA256SUMS.txt`
- **Windows (PowerShell)**: 
  ```powershell
  Get-Content SHA256SUMS.txt | ForEach-Object {
    $hash, $file = $_ -split '\s+', 2
    $computed = (Get-FileHash -Algorithm SHA256 $file).Hash
    if ($computed -eq $hash.ToUpper()) {
      Write-Host "$file : OK" -ForegroundColor Green
    } else {
      Write-Host "$file : FAILED" -ForegroundColor Red
    }
  }
  ```
- **Windows (Git Bash)**: `sha256sum -c SHA256SUMS.txt`

### Why verify checksums?

Checksum verification ensures:
- Files were not corrupted during download
- Files have not been tampered with by malicious actors
- You have the exact artifacts that were built and published by the release workflow

**Security best practice**: Always verify checksums before installing artifacts, especially when downloading from mirrors or third-party sources.
