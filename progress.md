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

## Next up

- Add a basic Settings UI (sound toggle, touch overlay sizing/opacity, persistent settings).
- Add keybind customization and local save management utilities.
- Start mobile/desktop wrappers once the web UX is stable.
