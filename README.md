# TanksFlashMobile

Fan project to bring back the classic Flash game **TANKS** (a Scorched Earth–style artillery game) on modern platforms:

- Web (baseline)
- Android + iOS (wrapped web build)
- Windows (desktop wrapper or PWA)

## Status

This repo is in early setup, but the web wrapper is already scaffolded under `apps/web`.

The actionable backlog lives in `TODO.md`.

## Quick start (web)

```bash
cd apps/web
npm install

# Optional: copy a local SWF into the dev server path
npm run sync:swf

npm run dev
```

Then open the printed local URL.

Notes:
- If your SWF lives somewhere else, you can import it into `assets/original/` (gitignored) via:
  - `npm run swf:import -- --from /path/to/tanks.swf`
- If you don’t have `assets/original/tanks.swf`, you can still use the **Load SWF…** button in the UI.
- Fullscreen: button or press `f`
- Touch overlay: toggle **Touch** in the toolbar (auto-defaults on coarse pointers)

### Smoke test

```bash
cd apps/web
npm run build
npm run test:smoke
```

## About assets / legality

This repo intentionally **does not** commit the original Flash binary or archive artifacts.

If you have a legal copy for personal use, place it at:

- `assets/original/tanks.swf`

That path is gitignored so it won’t be committed by accident.

## Likely technical approach

Start with a web wrapper that runs the SWF via **Ruffle** (WebAssembly), then package:

- Mobile: Capacitor (or similar)
- Desktop: Tauri/Electron or PWA

See `docs/MOBILE_WRAPPER.md` for Android/iOS build steps.

If Ruffle compatibility isn’t good enough for the full game, we can pivot to a full reimplementation using a cross‑platform engine (e.g., Godot).

## License

MIT for this repo’s original code (see `LICENSE`). Third-party attributions live in `THIRD_PARTY_NOTICES.md`.
