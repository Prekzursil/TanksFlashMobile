# Ruffle Update Cadence

We pin a specific `@ruffle-rs/ruffle` nightly version to keep the runtime reproducible across dev machines and CI.

## Cadence (recommended)

- **Monthly bump** (or sooner if a compatibility bug is blocking gameplay).

Ruffle is under active development, and nightlies can occasionally introduce regressions. A predictable cadence keeps
changes reviewable while still getting improvements regularly.

## How to bump the pinned nightly

1. Update the dependency version in `apps/web/package.json`:

   - Change `@ruffle-rs/ruffle` to the desired nightly tag.

2. Install updated dependencies:

   ```bash
   npm --prefix apps/web install
   ```

3. Validate the build and smoke test:

   ```bash
   npm --prefix apps/web run build
   npm --prefix apps/web run test:smoke
   ```

4. Sanity-check manually (recommended):

   - `npm --prefix apps/web run dev`
   - Load a known-good SWF via **Load SWF…** and verify audio, input, and fullscreen.

5. Commit the lockfile change:

   - `apps/web/package-lock.json`

Notes:

- `apps/web/scripts/sync_ruffle.mjs` copies the Ruffle runtime into `apps/web/public/ruffle/` as part of `predev` and
  `prebuild`. The `public/ruffle/` output is generated and should not be hand-edited.
- If a nightly bump breaks gameplay, revert to the last known-good nightly and capture diagnostics from the wrapper’s
  **Settings → Debug** panel for easier reporting.

