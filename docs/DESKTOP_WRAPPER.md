# Desktop Wrapper (Electron)

This project uses Electron to package the web build into a desktop app.

## Why Electron

Electron bundles Chromium, which is the most predictable runtime for a WebAssembly/WebGL-heavy app (Ruffle).

## Prerequisites

- Node.js 20+

Optional (for building on Windows/macOS):

- Windows: a Windows machine/runner (Electron Builder will produce an installer)
- macOS: Xcode command line tools

## Install

```bash
cd apps/desktop
npm install
```

## Dev (runs web dev server + Electron)

```bash
cd apps/desktop
npm run dev
```

## Package (Windows)

This produces a Windows installer via Electron Builder (NSIS target) **and** a portable `.zip` build.

```bash
cd apps/desktop

# Build the web app first (required)
npm --prefix ../web run build

# Sync the web dist into the Electron app
npm run sync:web

# Create the Windows installer
npm run package:win
```

Artifacts land in `apps/desktop/dist/`.

## Code signing (Windows, optional but recommended)

Windows code signing requires a code-signing certificate (usually a `.pfx`) tied to your identity (individual or company).
We cannot “download” a real trusted certificate for you — you obtain one from a Certificate Authority (CA) or use a signing
service (e.g., Azure Trusted Signing).

This repo is set up so that **unsigned builds still work**, but if signing secrets are present, Electron Builder will sign
the installer/executables automatically.

### Local signing

Set environment variables and then package:

```bash
cd apps/desktop

# Windows cmd.exe
set WIN_CSC_LINK=C:\\path\\to\\codesign.pfx
set WIN_CSC_KEY_PASSWORD=your_password_here
npm run package:win
```

### CI signing (GitHub Actions)

Add these repository secrets:

- `WINDOWS_CERT_PFX_BASE64`: base64-encoded `.pfx`
- `WINDOWS_CERT_PASSWORD`: password for the `.pfx`

The Windows CI job will decode the `.pfx` into the runner temp directory and set `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` for
Electron Builder.

To generate the base64 value without printing it to your terminal, you can use the helper script:

```bash
# From repo root:
node scripts/pfx_to_base64.mjs --in /path/to/codesign.pfx --out output/windows-cert.pfx.base64

# Set GitHub secrets (requires `gh auth login`)
gh secret set WINDOWS_CERT_PFX_BASE64 --body-file output/windows-cert.pfx.base64
gh secret set WINDOWS_CERT_PASSWORD --body "your_password_here"

# Delete the temp base64 file (it is sensitive)
rm -f output/windows-cert.pfx.base64
```

## Notes

- The Electron app loads the built web app from packaged files. For this to work, web build assets are configured to use relative paths (`apps/web/vite.config.ts`).
- GitHub Releases bundle the SWF, so the desktop wrapper runs out-of-the-box. The UI still supports **Load SWF…** for testing alternate files.
- The Windows icon is `apps/desktop/build/icon.ico` (generated from `assets/branding/icon.png`).
