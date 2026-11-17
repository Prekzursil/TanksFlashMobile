# Contributing to TanksFlashMobile

Thanks for contributing! This repo runs the fleet's lean 6-gate quality standard
([`Prekzursil/quality-zero-platform`](https://github.com/Prekzursil/quality-zero-platform),
charter: `docs/BEST-CONFIG.md`). Every PR must pass CI; nothing merges red.

## The gates (what CI runs on every PR)

Languages present in this checkout: TypeScript/JavaScript (root vitest suites,
`apps/web`, `apps/remake-web`, `apps/desktop`) and Python (`scripts/*.py`).

| # | Gate | Tools (pinned in CI) |
|---|------|----------------------|
| 1 | Lint + format | oxlint 1.69.0 (lint) + biome 2.5.x (formatter-only) [ts/js]; ruff 0.15.17 (`ruff check` + `ruff format --check`) [py] |
| 2 | Types | `tsc --noEmit` per tsconfig [ts]; basedpyright `standard` (`pyrightconfig.json`) [py] |
| 3 | Tests + coverage | root `npm run test:coverage` (vitest 4 + @vitest/coverage-v8) — **STRICT 100% line AND branch** |
| 4 | SAST | opengrep (curated ruleset or platform default) |
| 5 | Secrets | gitleaks (allowlist presence never disables it) |
| 6 | Deps | osv-scanner 2.3.8 (`osv-scanner.toml`) + Dependabot — every advisory blocks, `UNKNOWN` severity included |

CodeQL (`extended`-class queries via the SHA-pinned wrapper in
`.github/workflows/codeql.yml`) runs alongside as the security baseline and
blocks merges that introduce any-severity CodeQL alerts.

## Measured coverage scope (gate 3)

Measured (must stay 100% line + branch) — the first-party unit-testable web
client modules, exercised by the suites in `vitest/`:

- `apps/web/src/{config,debug,gamepad,i18n,input,touchControls,viewport}.ts`

Declared exclusions (see the reasoned list in `vitest.config.ts`):
`apps/web/src/main.ts` (browser bootstrap, an E2E surface covered by the
Playwright specs in `apps/web/e2e/`), `apps/web/src/ruffle.d.ts` (ambient
types), config/build tooling (`**/*.config.ts`, `scripts/**`, `*.mjs`/`*.cjs`).
Python `scripts/` are dev tooling with no unit-test surface by design.

## Local commands

```
npm install                                  # root tooling (vitest suites live at repo root)
npm run test:coverage                        # gate 3 exactly as CI runs it (100% L+B enforced)
npx oxlint@1.69.0 --deny-warnings .          # gate 1 lint
npx @biomejs/biome@2.5.0 ci --formatter-enabled=true --linter-enabled=false --assist-enabled=false .  # gate 1 format
osv-scanner scan source --config=osv-scanner.toml --recursive .  # gate 6
```

Per-app: `npm --prefix apps/web run build` / `test`, same for `apps/remake-web`;
`npm --prefix apps/desktop run package:win` builds the Electron shell.

## Rules

- Never weaken a gate to make a branch green: fix the code, bump the dependency,
  or (only for a genuinely unfixable advisory) add a dated, reasoned
  `[[IgnoredVulns]]` entry to `osv-scanner.toml` with an expiry.
- Tests ship with the change that needs them; coverage exclusions are declared,
  never silent.
- Dependency bumps that touch multiple lockfiles should land as one combined PR
  (see #278) — single-package bumps strand the deps gate when other vulnerable
  copies remain.
- Do not push to `main`; everything lands through a PR.
