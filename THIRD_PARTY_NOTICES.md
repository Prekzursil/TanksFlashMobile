# Third-party notices

This project depends on third-party open-source software.

## Policy

- We will keep third-party dependencies declared in package manifests/lockfiles.
- For distributable builds (APK/IPA/desktop installers), we will include an up-to-date third-party notices document and any required license texts.
- The original Flash game binary (`tanks.swf`) is **not** redistributed by default (see `docs/ASSET_POLICY.md`).

## Notable dependencies (non-exhaustive)

### Web wrapper (`apps/web`)

- **Ruffle** (`@ruffle-rs/ruffle`) — MIT OR Apache-2.0  
  - See: `apps/web/node_modules/@ruffle-rs/ruffle/LICENSE_MIT` and `LICENSE_APACHE`
- **Vite** — MIT (via npm dependency tree)
- **TypeScript** — Apache-2.0 (via npm dependency tree)
- **Playwright** — Apache-2.0 (dev dependency; used for smoke tests)

## Updating notices

When adding/updating dependencies:

1. Update `package.json` / lockfiles
2. Run relevant builds/tests
3. Update this file if the dependency is user-facing or included in shipped artifacts

