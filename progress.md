Original prompt: Maintain a persistent `TODO.md` backlog and, each run, implement a small batch of tasks on a branch/PR. Current goal is to revive the classic Flash game “TANKS” across web + mobile + desktop.

## 2026-02-08

- Created the initial prioritized backlog in `TODO.md`.
- Bootstrapped repo with docs and an asset policy that avoids redistributing the original SWF by default.
- Chosen initial approach: web-first wrapper using Ruffle; pivot to reimplementation only if compatibility is insufficient (see `docs/PORTING_STRATEGY.md`).
- Implemented a Vite + TypeScript web wrapper (`apps/web`) that self-hosts Ruffle (synced into `public/ruffle/`) and loads the SWF from `/original/tanks.swf` (or via file picker).
- Added scaling modes (fit/fill/integer), fullscreen toggle (button + `f`), and an initial touch overlay that drives keyboard events through a central input mapper.
- Added an in-repo Playwright smoke test harness (`apps/web/scripts/smoke_test.mjs`) and GitHub Actions CI to run build + smoke on PRs.
- Added MIT licensing (`LICENSE`) plus a lightweight third-party attribution policy (`THIRD_PARTY_NOTICES.md`).
- Added ESLint + Prettier to `apps/web` and wired lint/format checks into CI.
- Added a Settings dialog for scale mode, audio (mute/volume), touch overlay configuration (enable/preset/size/opacity), and keybind customization (persisted + reset).
- Added storage management tools in Settings (export/import wrapper `localStorage`, clear wrapper settings, and best-effort clear of all site data including IndexedDB).
- Added a helper script to import/copy a SWF into `assets/original/` without committing it (`npm run swf:import -- --from ...`).
- Added Capacitor scaffolding + docs for Android/iOS builds (`docs/MOBILE_WRAPPER.md`).
- Added `capacitor.config.json` and root scripts for `cap` workflows.
- Generated `android/` and `ios/` projects via Capacitor.
- Smoke test passes after hardening timeouts/logging in `apps/web/scripts/smoke_test.mjs`.
- Added an Electron desktop wrapper (`apps/desktop`) plus docs and CI pipeline for Windows packaging.
- Added original branding assets + generator script and wired icons/splashes for Android/iOS/Windows (`assets/branding/`, `scripts/generate_branding_assets.py`).
- Added debug tools (Settings → Debug) with overlay + diagnostics/log export to help testers share issues.
- Documented a monthly Ruffle nightly update cadence (`docs/RUFFLE_UPDATES.md`) and added a wrapper to run the Playwright choreography client without the Node ESM warning (`scripts/run_web_game_client.mjs`).

## Next up

- Touch overlay layout presets (left-handed / tablet) and draggable positioning.
- Store polish: finalize Capacitor identifiers, Windows signing + metadata.
- Reduce input conflicts: consider ignoring remaps while SWF UI is focused.

## 2026-02-08 (later)

- Added touch layout presets in the web wrapper: `leftHanded` and `tablet`, plus an “Edit layout” mode that lets you drag the D-pad/action clusters and persists offsets per preset (`tanks.touchLayouts`).
- Added a key remap enable/disable toggle to avoid conflicts with SWF UI (`tanks.keyRemapEnabled`); when disabled, physical keys are no longer intercepted by the wrapper remapper.
- Tweaked `DEFAULT_SWF_URL` to respect Vite `base` so Electron `file://` builds can still auto-load `./original/tanks.swf`.
- Finalized app identifiers for publishing: `appName` = `Tanks`, `appId` = `com.prekzursil.tanks` (Capacitor + Android + iOS + Electron aligned).
- Added Windows installer metadata defaults for Electron Builder (NSIS options + explicit execution level) and wired optional code signing in CI (requires a real `.pfx` + secrets).
- Enabled a portable Windows `.zip` artifact target alongside the NSIS installer (useful for unsigned distribution).
- Added a multi-source input mapper so touch + keyboard remap + gamepad can coexist without releasing each other’s presses.
- Added gamepad support (standard mapping) with a Settings toggle and richer diagnostics (`pressed` keys + gamepad status).
- Added an in-app “Controls & Tips” Help dialog and updated README notes to match the current UI.
- Added a helper script for base64-encoding a `.pfx` into a GitHub Secret without printing it (`scripts/pfx_to_base64.mjs`).
- Accessibility pass: added wrapper UI scaling (Settings → Display → UI scale), larger default UI hit targets (44px min), and clearer focus-visible outlines; touch buttons now have descriptive ARIA labels/state.
- Build/release automation (option 1): CI now uploads build artifacts for web (`web-dist`), Windows (`desktop-windows`), and Android debug APK (`android-debug-apk`) via GitHub Actions artifacts.
- Localization-ready UI: routed wrapper UI strings through a simple i18n module (`apps/web/src/i18n.ts`) with English as the first locale.
- Added an iOS Simulator CI artifact (`ios-simulator-app`) for PRs/main so QA can install on Simulator without App Store signing.
- Added a tag-based release workflow that attaches web/windows/android/ios-simulator artifacts (plus checksums) to GitHub Releases.
- Added a README “Downloads” section with a screenshot and quick install/run notes per platform.
- Added a repo-level `VERSION` file and a `scripts/sync_versions.mjs` helper to keep web/desktop/Android/iOS versions aligned (CI verifies on PRs; Releases verify tag matches `VERSION`).
- Added optional Android **release** signing on tags (signed `.apk`/`.aab` only when keystore secrets are present; PRs remain debug builds).
- Added a Gamepad settings panel for button mapping + stick deadzone, persisted via `localStorage`.
- Added a minimal Godot clean-room reimplementation spike (`apps/remake-godot`) with procedural terrain, destructible craters, turn-based firing, and a win condition; spike docs live in `docs/REIMPLEMENTATION_GODOT.md`.
- Expanded the Godot spike with fuel-limited movement, per-turn wind, a turn timer, and multiple weapons; documented the remake v1 scope and input plan.
- Added Godot desktop export presets and a CI job to produce Windows/Linux/macOS export artifacts.
- Added a Canvas/TypeScript clean-room web remake spike (`apps/remake-web`) with deterministic Playwright hooks (`render_game_to_text`, `advanceTime`) and CI smoke/build artifacts.

## 2026-02-09

- Continued work on branch `feat/godot-spike-batch-01` (same PR flow).
- Implemented original asset extraction pipeline with SWF parsing + dual-target output:
  - script: `scripts/extract_original_assets.mjs`
  - command: `npm run assets:extract:original`
  - outputs:
    - `apps/remake-godot/assets/original/`
    - `apps/remake-web/public/original/`
- Added/updated root dev dependencies for extraction:
  - `swf-extract`
  - `lodash` (runtime dep needed by `swf-extract`)
- Fixed extraction compatibility issue: normalized extracted image output to PNG (Godot headless import rejected raw extracted JPEG data stream).
- Integrated original assets into Godot remake:
  - menu backgrounds + portraits from extracted textures
  - fire/impact/UI click SFX from extracted audio
  - paths switched to `.png` textures in `apps/remake-godot/scripts/main.gd`
- Added audio players and background texture nodes in Godot scene:
  - `apps/remake-godot/scenes/Main.tscn`
- Implemented web remake TODOs for HUD/menus/touch/original assets integration:
  - topbar pause/settings controls
  - modal pause/settings screens
  - in-game HUD panel (stats + message)
  - touch overlay with hold actions + fire/weapon buttons
  - persisted touch settings (enabled/layout)
  - imported original images/audio in rendering + SFX
  - restored continuous game frame loop (`requestAnimationFrame`) for normal runtime
- Validation runs:
  - `npm --prefix apps/remake-web run build` ✅
  - `npm --prefix apps/remake-web run lint` ✅
  - `npm --prefix apps/remake-web run test:smoke` ✅
  - develop-web-game Playwright client run with action payloads ✅ (`output/web-game/`)
  - Docker Godot export check ✅ (`barichello/godot-ci:4.2.2`, Linux/X11 export)

## Next up

- Web remake gameplay parity task is still open (`TODO.md`): align remaining behavior differences vs Godot (rules edge cases, balancing, model consistency).
- Store readiness tasks remain open (submission checklist, privacy/support URL, metadata audit).

## 2026-02-10

- Closed web remake gameplay parity TODO by adding explicit gameplay phase state in `apps/remake-web/src/main.ts`:
  - `aim`, `firing`, `impact`, `gameover`
  - phase-based fire/weapon gating aligned to Godot flow
  - phase now exposed via `render_game_to_text`
- Added parity tracking document:
  - `docs/WEB_REMAKE_PARITY.md`
- Closed store readiness TODO set with docs:
  - `docs/STORE_SUBMISSION_CHECKLIST.md`
  - `docs/PRIVACY_POLICY.md`
  - `docs/SUPPORT.md`
  - `docs/APP_METADATA_AUDIT.md`
- Linked store-readiness docs in `README.md`.
- Updated `TODO.md` to mark:
  - Web remake gameplay parity ✅
  - Store submission checklist ✅
  - Privacy policy + support URL ✅
  - App metadata audit ✅
- Validation re-run:
  - `npm --prefix apps/remake-web run build` ✅
  - `npm --prefix apps/remake-web run lint` ✅
  - `npm --prefix apps/remake-web run test:smoke` ✅

- Added web remake gameplay polish batch (option 2) in `apps/remake-web/src/main.ts`:
  - deterministic aim-phase trajectory preview using current angle/power/weapon/wind
  - camera follow drift toward active tank/projectile
  - fire/impact camera cues (brief zoom + impact shake decay)
  - camera state exposed in `render_game_to_text` for test visibility
- Updated docs/backlog for this batch:
  - `docs/REIMPLEMENTATION_WEB.md` (trajectory + camera cues noted)
  - `docs/WEB_REMAKE_PARITY.md` (web-only polish section)
  - `TODO.md` (new completed follow-up entries for trajectory preview and camera cues)
- Validation for polish batch:
  - `npm --prefix apps/remake-web run build` ✅
  - `npm --prefix apps/remake-web run lint` ✅
  - `npm --prefix apps/remake-web run test:smoke` ✅
  - develop-web-game Playwright client run + screenshot/state inspection ✅ (`output/web-game/shot-*.png`, `state-*.json`)
