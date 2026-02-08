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

This produces a Windows installer via Electron Builder (NSIS target).

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

## Notes

- The Electron app loads the built web app from packaged files. For this to work, web build assets are configured to use relative paths (`apps/web/vite.config.ts`).
- We still do **not** redistribute the original SWF. Users should use the in-app **Load SWF…** picker.

