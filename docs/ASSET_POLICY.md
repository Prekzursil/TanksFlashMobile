# Asset Policy (Original SWF and Redistribution)

## TL;DR

- This repo includes the original SWF at `assets/original/tanks.swf`.
- GitHub Releases ship the SWF inside the web `dist/` bundle so the wrapper runs out-of-the-box.
- The UI still supports a **bring‑your‑own‑SWF** flow for testing alternate files.

## Why

Even if a game was historically “free to play”, that usually **does not** grant the right to redistribute the binary or its assets.

For this repo, we are proceeding with redistribution because the maintainer asserts we have explicit permission to use and
redistribute the original SWF/assets (see `docs/ASSET_PERMISSION_LETTER.md`).

If you fork or reuse this project, you are responsible for ensuring you have rights to distribute any included original
assets.

## Local development (alternate SWF)

You can test a different SWF without touching the repo by using the in-app **Load SWF…** picker.

If you specifically want the app to autoload your alternate SWF on startup, replace:

- `assets/original/tanks.swf`

(this will show up as a git diff), then from `apps/web/`, run:

```bash
npm run sync:swf
```

### Helper script

If your SWF is somewhere else, you can copy (or download) it into `assets/original/` using:

```bash
npm run swf:import -- --from /path/to/tanks.swf
```

This script is a convenience only; you’re responsible for ensuring you have the right to use any SWF you provide.

## Shipping options

This repo currently ships the original SWF in Releases. Alternatives are still viable:

1. **Explicit permission / license obtained**
   - We can ship the SWF and/or original assets per the granted terms.
2. **BYO-SWF release**
   - The app ships without the SWF; users import it on first run.
3. **Clean-room remake**
   - Ship fully original code + properly licensed/new assets (no SWF).
