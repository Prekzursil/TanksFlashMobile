Original prompt: Maintain a persistent `TODO.md` backlog and, each run, implement a small batch of tasks on a branch/PR. Current goal is to revive the classic Flash game “TANKS” across web + mobile + desktop.

## 2026-02-08

- Created the initial prioritized backlog in `TODO.md`.
- Bootstrapped repo with docs and an asset policy that avoids redistributing the original SWF by default.
- Chosen initial approach: web-first wrapper using Ruffle; pivot to reimplementation only if compatibility is insufficient (see `docs/PORTING_STRATEGY.md`).
- Implemented a Vite + TypeScript web wrapper (`apps/web`) that self-hosts Ruffle (synced into `public/ruffle/`) and loads the SWF from `/original/tanks.swf` (or via file picker).
- Added scaling modes (fit/fill/integer), fullscreen toggle (button + `f`), and an initial touch overlay that drives keyboard events through a central input mapper.

## Next up

- Add a Playwright smoke test harness into the repo (currently using the skill script for local verification only).
- Add CI to run the smoke test and basic build checks on PRs.
