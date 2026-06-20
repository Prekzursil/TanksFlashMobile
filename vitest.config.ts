import { defineConfig } from 'vitest/config';

// Root vitest config for the lean quality gate (gate 3 — jsts coverage).
//
// The reusable lean workflow runs the JS/TS coverage lane in the ROOT project
// dir (a root package.json exists, so it does NOT descend into apps/*). It runs
// `npm run test:coverage` and requires 100% line + branch.
//
// COVERAGE SCOPE (`coverage.include`): the genuinely unit-testable first-party
// TypeScript modules of the web client. These are pure-logic / thin-DOM units
// exercised directly by the suites under `tests/web/`. Excluded from coverage
// (NOT weakening — each is a non-unit surface or a non-source artifact):
//   - apps/web/src/main.ts   : the browser BOOTSTRAP entrypoint. It has no
//       exports and executes top-level DOM wiring on import (querySelector('#app'),
//       required('#viewport') which THROWS without the full index.html, Ruffle
//       player bootstrap, style.css import). It is an integration/E2E surface,
//       already covered by the Playwright specs in apps/web/e2e/ — not a unit.
//   - apps/web/src/ruffle.d.ts : ambient type declarations (no runtime code).
//   - **/*.config.ts, scripts/**, *.mjs/*.cjs : build/dev tooling, not product
//       units; covered by their own smoke tests / the build itself.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'apps/web/src/config.ts',
        'apps/web/src/debug.ts',
        'apps/web/src/gamepad.ts',
        'apps/web/src/i18n.ts',
        'apps/web/src/input.ts',
        'apps/web/src/touchControls.ts',
        'apps/web/src/viewport.ts',
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
