# Asset Policy (Original SWF and Redistribution)

## TL;DR

- This project **does not** commit or redistribute the original `tanks.swf` by default.
- For local development/testing, you can place the SWF in `assets/original/` (gitignored).
- The web wrapper also supports a **bring‑your‑own‑SWF** flow.

## Why

Even if a game was historically “free to play”, that usually **does not** grant the right to redistribute the binary or its assets.

Until we have explicit permission / license terms allowing redistribution, the safe default is:

- **No original SWF in git**
- **No SWF shipped in releases**

## Local development (BYO SWF)

1. Obtain the SWF legally for personal use.
2. Place it at:
   - `assets/original/tanks.swf`

This repo ignores `assets/original/` so you won’t commit it by accident.

### Helper script

If your SWF is somewhere else, you can copy (or download) it into `assets/original/` using:

```bash
npm run swf:import -- --from /path/to/tanks.swf
```

This script is a convenience only; you’re responsible for ensuring you have the right to use any SWF you provide.

## Shipping options (future)

We’ll pick one of these once rights are clarified:

1. **Explicit permission / license obtained**
   - We can ship the SWF and/or original assets per the granted terms.
2. **BYO-SWF release**
   - The app ships without the SWF; users import it on first run.
3. **Clean-room remake**
   - Ship fully original code + properly licensed/new assets (no SWF).

## What we still need to verify

- Who currently owns the rights to the original game and assets.
- Whether redistribution is allowed, and under what constraints (attribution, non-commercial, etc.).
