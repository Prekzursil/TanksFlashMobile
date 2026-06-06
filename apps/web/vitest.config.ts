import { defineConfig } from "vitest/config";

// Vitest configuration for the web wrapper's unit-test suite.
//
// Coverage uses the v8 provider and emits an LCOV report so the repo's
// `scripts/quality/assert_coverage_100.py` gate (which understands `LF:`/`LH:`
// records) and Codecov can both consume `coverage/lcov.info`.
//
// The coverage denominator intentionally includes ALL executable source under
// `src/`. We do NOT shrink `include` to only the currently-tested modules:
// that would inflate the reported percentage and hide the real, sized
// test-authoring work that still remains for the DOM-heavy modules
// (main.ts, gamepad.ts, touchControls.ts). Only declaration files (`*.d.ts`,
// no executable lines) and non-source assets are excluded.
export default defineConfig({
  define: {
    // main.ts reads this Vite-injected global; provide a value so modules that
    // (transitively) reference it can be imported under the test runner.
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    // jsdom gives us `window`, `document`, and `KeyboardEvent` for the
    // DOM-touching pure logic (e.g. input.ts dispatches KeyboardEvents).
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: [
        // Type-only declaration files have no executable lines.
        "src/**/*.d.ts",
      ],
      // Honest reporting: every source file appears in the denominator even if
      // it has no test yet, so the report reflects true coverage.
      all: true,
    },
  },
});
