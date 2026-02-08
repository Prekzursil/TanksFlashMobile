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
