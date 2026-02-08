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

## Next up

- Decide the Windows packaging path (Tauri/Electron/PWA) and implement the chosen pipeline.
- Add initial icon/splash assets and wire them into Android/iOS/Windows.
