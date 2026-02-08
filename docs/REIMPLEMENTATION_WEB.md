# Web Reimplementation Spike (Canvas/TypeScript)

This repo contains a Ruffle wrapper around the original Flash game **and** two clean-room remake tracks:

- Godot spike: `apps/remake-godot/` (see `docs/REIMPLEMENTATION_GODOT.md`)
- Web spike: `apps/remake-web/` (this document)

The web spike is a lightweight **Canvas 2D + TypeScript** prototype intended to be fast to iterate, easy to test, and
useful for validating core gameplay without any Flash/SWF dependencies.

## Goals

- Validate the artillery loop (aim → fire → arc → impact → crater → damage) in pure web tech.
- Provide deterministic hooks (`window.advanceTime`, `window.render_game_to_text`) for automated Playwright testing.
- Keep the project **clean-room** (no SWF, no extracted assets, no decompiled logic).

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

This is intentionally a “spike”, not a full game:

- placeholder visuals only
- no audio
- input is hard-coded (no remapping UI yet)
- no mobile-specific UX yet

If we pursue this track beyond the spike, we should migrate input to an action-based layer (similar to the wrapper’s
input mapping approach) and then add touch/gamepad mappings.
