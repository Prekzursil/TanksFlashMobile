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

This repo supports two Windows signing paths:

1. **Azure Artifact Signing (recommended)** using GitHub OIDC and `azure/artifact-signing-action`.
2. **Legacy `.pfx` fallback** using Electron Builder env vars.

Unsigned builds still work if neither path is configured.

### CI signing via Azure Artifact Signing (recommended)

Workflows are already wired to sign when these GitHub repository secrets are present:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TRUSTED_SIGNING_ENDPOINT` (example: `https://weu.codesigning.azure.net/`)
- `AZURE_TRUSTED_SIGNING_ACCOUNT_NAME`
- `AZURE_TRUSTED_SIGNING_CERT_PROFILE`

Setup summary:

1. Create an Azure Artifact Signing account + certificate profile.
2. Create an Entra app registration/service principal.
3. Add a GitHub OIDC federated credential on that app.
4. Grant the service principal the `Artifact Signing Certificate Profile Signer` role.
5. Add the secrets above to this repository.

When configured, CI/release workflows sign built `.exe`/`.dll` binaries post-package and rebuild the portable zip from signed files.

### Local/CI `.pfx` fallback

If Azure Artifact Signing secrets are not configured, workflows can still use `.pfx` secrets:

- `WINDOWS_CERT_PFX_BASE64`
- `WINDOWS_CERT_PASSWORD`

For local packaging:

```bash
cd apps/desktop
set WIN_CSC_LINK=C:\\path\\to\\codesign.pfx
set WIN_CSC_KEY_PASSWORD=your_password_here
npm run package:win
```

To create `WINDOWS_CERT_PFX_BASE64` safely:

```bash
node scripts/pfx_to_base64.mjs --in /path/to/codesign.pfx --out output/windows-cert.pfx.base64
gh secret set WINDOWS_CERT_PFX_BASE64 --body-file output/windows-cert.pfx.base64
gh secret set WINDOWS_CERT_PASSWORD --body "your_password_here"
rm -f output/windows-cert.pfx.base64
```

## Notes

- The Electron app loads the built web app from packaged files. For this to work, web build assets are configured to use relative paths (`apps/web/vite.config.ts`).
- GitHub Releases bundle the SWF, so the desktop wrapper runs out-of-the-box. The UI still supports **Load SWF…** for testing alternate files.
- The Windows icon is `apps/desktop/build/icon.ico` (generated from `assets/branding/icon.png`).
