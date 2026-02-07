# TanksFlashMobile

Fan project to bring back the classic Flash game **TANKS** (a Scorched Earth–style artillery game) on modern platforms:

- Web (baseline)
- Android + iOS (wrapped web build)
- Windows (desktop wrapper or PWA)

## Status

This repo is in early setup/planning. The actionable backlog lives in `TODO.md`.

## About assets / legality

This repo intentionally **does not** commit the original Flash binary or archive artifacts.

If you have a legal copy for personal use, place it at:

- `assets/original/tanks.swf`

That path is gitignored so it won’t be committed by accident.

## Likely technical approach

Start with a web wrapper that runs the SWF via **Ruffle** (WebAssembly), then package:

- Mobile: Capacitor (or similar)
- Desktop: Tauri/Electron or PWA

If Ruffle compatibility isn’t good enough for the full game, we can pivot to a full reimplementation using a cross‑platform engine (e.g., Godot).
