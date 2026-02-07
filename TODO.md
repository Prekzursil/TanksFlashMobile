# Project Backlog

## High priority
- [ ] Decide porting strategy – Choose between a Ruffle-wrapper-first approach vs a full reimplementation, with acceptance criteria for each.
- [ ] Verify redistribution rights – Confirm whether we can ship the original SWF/assets; if not, document a “bring-your-own-SWF” workflow.
- [ ] Web wrapper MVP – Build a minimal web app that embeds Ruffle and loads `assets/original/tanks.swf` (show a clear error if missing).
- [ ] Responsive scaling & fullscreen – Add scaling modes (fit/fill/integer scale) plus a fullscreen toggle that works on desktop and mobile.
- [ ] Input mapping layer – Centralize input so keyboard, touch overlay, and (later) gamepad can drive the SWF consistently.
- [ ] Mobile touch controls v1 – Implement an on-screen controls overlay suitable for phones/tablets (D‑pad/buttons + layout presets).
- [ ] Smoke test harness – Add a Playwright script that launches the web build, waits for render, captures a screenshot, and fails on console errors.
- [ ] CI for lint/tests – Add GitHub Actions to run lint/tests and the Playwright smoke test on every PR.

## Medium priority
- [ ] Choose repo license – Pick an OSS license for *our* code and add an attribution policy for third-party dependencies.
- [ ] Web tooling scaffold – Set up Vite (or similar), TypeScript, and a single-command dev loop (`npm run dev`).
- [ ] Lint/format baseline – Add ESLint + Prettier (or equivalent) with consistent rules and CI enforcement.
- [ ] Settings UI – Add an in-game settings panel for scaling mode, fullscreen, sound, and touch-overlay size/opacity.
- [ ] Keybind customization – Allow remapping keys via the settings UI, persisted locally (with a “reset to defaults” option).
- [ ] Local save management – Provide an easy way to clear/export/import local storage for debugging and user support.
- [ ] Asset download helper – Add documented scripts/instructions to fetch the SWF into `assets/original/` for local dev (without committing it).
- [ ] Android wrapper – Package the web build into an Android app (Capacitor or equivalent) and document build/signing steps.
- [ ] iOS wrapper – Package the web build into an iOS app (Capacitor or equivalent) and document build/signing steps.
- [ ] Windows packaging path – Decide between Tauri/Electron/PWA and implement a Windows build pipeline for the chosen option.
- [ ] App icon + splash – Add initial icon/splash assets and hook them up for Android/iOS/Windows builds.
- [ ] Debug logging mode – Add an optional debug overlay or log export so testers can share useful diagnostics.

## Low priority
- [ ] Gamepad support – Map common controllers to the input layer (Xbox/PS/Switch layouts) and document the mappings.
- [ ] Accessibility pass – Larger touch targets, configurable UI scale, and basic contrast checks for menus/overlays.
- [ ] In-app help – Add a “Controls & Tips” screen explaining input, turn flow, and common gameplay mechanics.
- [ ] Build/release automation – Add scripts for versioning and producing release artifacts (APK/IPA/EXE) consistently.
- [ ] Localization-ready UI – Route UI strings through a simple i18n layer (English first).
- [ ] Reimplementation spike – Prototype a clean-room remake (e.g., Godot) to estimate scope if Ruffle compatibility is insufficient.
- [ ] Landing page – Add a small website/README section with screenshots, downloads, and installation instructions.
