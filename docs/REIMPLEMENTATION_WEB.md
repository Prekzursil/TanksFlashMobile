# Web Reimplementation (Canvas/TypeScript)

This repo contains a Ruffle wrapper around the original Flash game **and** two clean-room remake tracks:

- Godot spike: `apps/remake-godot/` (see `docs/REIMPLEMENTATION_GODOT.md`)
- Web spike: `apps/remake-web/` (this document)

The web remake is a lightweight **Canvas 2D + TypeScript** implementation intended to be fast to iterate, easy to
test, and useful for validating core gameplay without Flash runtime dependencies.

Related docs:
- Parity tracking: `docs/WEB_REMAKE_PARITY.md`

## Goals

- Validate the artillery loop (aim → fire → arc → impact → crater → damage) in pure web tech.
- Provide deterministic hooks (`window.advanceTime`, `window.render_game_to_text`) for automated Playwright testing.
- Keep gameplay logic implemented in TypeScript while supporting imported original art/audio assets.

## Run It

```bash
npm --prefix apps/remake-web install
npm --prefix apps/remake-web run dev
```

Then open the printed URL.

## Controls

- `A/D`: move (limited fuel)
- `Left/Right`: adjust angle
- `Up/Down`: adjust power
- `1/2/3`: weapon select
- `Space`: fire
- `R`: reset match
- `F`: fullscreen
- `Esc`: pause/resume

## UI and Touch

- HUD panel with turn, weapon, angle, power, wind, fuel, timer, and HP.
- Menu flow with start, pause, and settings dialogs.
- Touch controls for movement, aim, power, weapon select, and fire.
- Aim-phase trajectory preview for ballistic pre-aim.
- Camera cues during combat (projectile follow drift + impact shake/zoom).
- Settings persistence in `localStorage`:
  - `touchEnabled` (auto-default for coarse pointers)
  - `touchLayout` (`right` or `left` handed)

## Imported Original Assets

The web remake now loads imported asset files generated from the original SWF:

- Background/tank images under `apps/remake-web/public/original/images/`
- SFX under `apps/remake-web/public/original/sounds/`
- Manifest: `apps/remake-web/public/original/manifest.json`

Assets are regenerated with:

```bash
npm run assets:extract:original
```

The extractor script normalizes SWF image output to PNG for cross-engine compatibility:

- script: `scripts/extract_original_assets.mjs`

## Automated Smoke Test

```bash
npm --prefix apps/remake-web run build
npm --prefix apps/remake-web run test:smoke
```

The smoke test:

- builds the app
- starts `vite preview`
- clicks **Start**
- verifies `window.advanceTime` and `window.render_game_to_text`
- captures a screenshot
- fails on any console/page errors

Artifacts are written under `apps/remake-web/output/smoke/`.

## Scope Notes

This is still intentionally limited in scope:

- no full campaign/game mode set
- no network/multiplayer
- no per-action key remapping UI yet
- parity tracking exists, but broader content parity remains future work
