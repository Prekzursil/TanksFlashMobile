# Project Backlog

## High priority
- [x] Decide porting strategy – Choose between a Ruffle-wrapper-first approach vs a full reimplementation, with acceptance criteria for each.
- [x] Verify redistribution rights – Confirm whether we can ship the original SWF/assets; if not, document a “bring-your-own-SWF” workflow.
- [x] Ship original SWF in builds/releases – Bundle `assets/original/tanks.swf` so Releases and apps run out-of-the-box (no file picker required).
- [x] Document asset permission – Add/clarify licensing/permission notes for the bundled original assets.
- [x] Web wrapper MVP – Build a minimal web app that embeds Ruffle and loads `assets/original/tanks.swf` (show a clear error if missing).
- [x] Responsive scaling & fullscreen – Add scaling modes (fit/fill/integer scale) plus a fullscreen toggle that works on desktop and mobile.
- [x] Input mapping layer – Centralize input so keyboard, touch overlay, and (later) gamepad can drive the SWF consistently.
- [x] Mobile touch controls v1 – Implement an on-screen controls overlay suitable for phones/tablets (D‑pad/buttons + layout presets).
- [x] Smoke test harness – Add a Playwright script that launches the web build, waits for render, captures a screenshot, and fails on console errors.
- [x] CI for lint/tests – Add GitHub Actions to run lint/tests and the Playwright smoke test on every PR.

### Godot remake track (post-spike)
- [x] Define remake v1 scope – Document must-have mechanics (movement/fuel/wind/weapons) and what we’ll defer.
- [x] Godot core gameplay v1 – Add tank movement + basic turn flow (fuel/timer) + wind and at least one weapon type.
- [x] Godot export pipeline (desktop) – Add `export_presets.cfg` and CI artifacts for Windows/macOS/Linux.
- [x] Godot input mapping – Plan keyboard/gamepad/touch controls and how they map to gameplay actions.

### Godot remake track (v1)
- [x] Godot releases – On version tags, attach Godot desktop exports to GitHub Releases (Windows/Linux/macOS).
- [x] Godot HUD + menus – Add start/pause/settings screens plus an in-game HUD for turn state (wind/fuel/health/weapon).
- [x] Godot touch controls – Implement mobile-friendly aiming/movement/shoot UI (no hardware keyboard required).
- [x] Godot mobile exports – Add Android/iOS export presets and a minimal build doc for device/TestFlight builds.
- [x] Godot original assets integration – Extract/import original art/audio (license-permitted) and replace placeholders (keep gameplay code reimplemented).

### Web remake track (post-spike)
- [x] Web remake spike – Prototype a clean-room Canvas/TypeScript remake with deterministic test hooks.
- [x] Web remake CI smoke – Add Playwright smoke test and CI job for the remake web spike.
- [x] Web remake releases – On version tags, attach the remake web `dist/` zip to GitHub Releases.

### Web remake track (v1)
- [x] Web remake HUD + menus – Add a basic HUD (angle/power/weapon) and menu screens (start/pause/settings).
- [x] Web remake touch controls – Add touch aiming + fire controls that work on phones/tablets.
- [x] Web remake gameplay parity – Track and close gaps vs the Godot ruleset (weapons, turn flow, damage model).
- [x] Web remake original assets integration – Extract/import original art/audio (license-permitted) and replace placeholders (keep gameplay code reimplemented).

### Store readiness
- [x] Store submission checklist – Document Play Store + App Store requirements (accounts, signing, screenshots, privacy).
- [x] Privacy policy + support URL – Add a simple privacy policy (even if “no data collected”) and a support/contact URL.
- [x] App metadata audit – Verify names/ids/icons/orientation/versioning are consistent across Android/iOS/Windows builds.

## Medium priority
- [x] Choose repo license – Pick an OSS license for *our* code and add an attribution policy for third-party dependencies.
- [x] Web tooling scaffold – Set up Vite (or similar), TypeScript, and a single-command dev loop (`npm run dev`).
- [x] Lint/format baseline – Add ESLint + Prettier (or equivalent) with consistent rules and CI enforcement.
- [x] Settings UI – Add an in-game settings panel for scaling mode, fullscreen, sound, and touch-overlay size/opacity.
- [x] Keybind customization – Allow remapping keys via the settings UI, persisted locally (with a “reset to defaults” option).
- [x] Local save management – Provide an easy way to clear/export/import local storage for debugging and user support.
- [x] Asset download helper – Add documented scripts/instructions to fetch the SWF into `assets/original/` for local dev (without committing it).
- [x] Android wrapper – Package the web build into an Android app (Capacitor or equivalent) and document build/signing steps.
- [x] iOS wrapper – Package the web build into an iOS app (Capacitor or equivalent) and document build/signing steps.
- [x] Windows packaging path – Decide between Tauri/Electron/PWA and implement a Windows build pipeline for the chosen option. (Chosen: Electron)
- [x] App icon + splash – Add initial icon/splash assets and hook them up for Android/iOS/Windows builds.
- [x] Debug logging mode – Add an optional debug overlay or log export so testers can share useful diagnostics.

### Discovered follow-ups
- [x] Pin Ruffle update cadence – Decide how often to bump `@ruffle-rs/ruffle` nightly and document the process.
- [x] Fix Playwright tool warning – Silence the Node ESM warning in the bundled `web_game_playwright_client.js` setup (optional cleanup).
- [x] Touch overlay layout presets – Add “left-handed” / “tablet” layouts and allow dragging controls to reposition.
- [x] Avoid keybind conflicts with SWF UI – Consider a “disable remap when SWF has focus” mode if conflicts are observed.
- [x] Finalize Capacitor identifiers – Confirm app id/name before publishing to stores.
- [x] Windows signing + metadata – Add app icon, publisher metadata, and code signing support for the Electron installer.
- [x] Add portable Windows ZIP artifact – Produce a `.zip` alongside the NSIS installer for easier unsigned distribution.
- [x] Helper for Windows signing secrets – Add a script to base64-encode a `.pfx` for GitHub Secrets without printing it.
- [ ] Configure Azure Artifact Signing secrets – Provision Artifact Signing account/profile + OIDC app and set `AZURE_*` signing secrets to enable signed Windows CI/release artifacts.
- [x] Release versioning – Align version numbers across `apps/web`, `apps/desktop`, and Capacitor (Android/iOS) and surface the current version in the UI.
- [x] Android release signing in CI – On tag builds, optionally produce a signed APK/AAB when keystore secrets are present (keep debug artifacts for PRs).
- [x] Web remake trajectory preview – Draw a deterministic ballistic preview path in aim phase so players can pre-aim before firing.
- [x] Web remake camera cues – Add subtle shot follow + impact shake/zoom cues to improve shot readability and feedback.
- [x] Web remake camera intensity setting – Add `off`/`low`/`default` camera motion settings for accessibility and reduced-motion preference.

## Low priority
- [x] Gamepad support – Map common controllers to the input layer (Xbox/PS/Switch layouts) and document the mappings.
- [x] Accessibility pass – Larger touch targets, configurable UI scale, and basic contrast checks for menus/overlays.
- [x] In-app help – Add a “Controls & Tips” screen explaining input, turn flow, and common gameplay mechanics.
- [x] Build/release automation – Produce CI build artifacts (web `dist/`, Windows installer/zip, Android debug APK) for PRs/main pushes.
- [x] Localization-ready UI – Route UI strings through a simple i18n layer (English first).
- [x] Reimplementation spike – Prototype a clean-room remake (e.g., Godot) to estimate scope if Ruffle compatibility is insufficient.
- [x] Landing page – Add a small website/README section with screenshots, downloads, and installation instructions.
- [x] Gamepad mapping customization – Allow remapping gamepad buttons and stick deadzones for edge-case controllers.
- [x] iOS CI artifact (simulator) – Build an unsigned iOS Simulator `.app` on macOS runners for quick QA (no App Store signing).
- [x] Tag-based releases – On version tags, attach artifacts to a GitHub Release (keeps PR CI as-is).
