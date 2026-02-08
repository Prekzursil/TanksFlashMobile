# Godot Reimplementation Spike

This repo started as a **Ruffle wrapper** around the original Flash game. This document describes a *separate* effort:
a **clean-room** reimplementation spike in **Godot 4** to estimate scope and validate that the core gameplay loop is
feasible if Ruffle compatibility becomes a blocker.

The spike lives in `apps/remake-godot/`.

Related docs:
- Scope: `docs/REMAKE_V1_SCOPE.md`
- Input plan: `docs/GODOT_INPUT_MAPPING.md`

## Goals (What This Spike Is For)

- Validate core artillery mechanics (aim → fire → ballistic arc → impact → damage).
- Validate destructible terrain (craters) without relying on Flash internals.
- Establish a minimal Godot project structure we can iterate on.
- Keep everything **clean-room**: no SWF, no extracted assets, no decompiled code.

## Non-goals (What This Spike Is Not)

- A full remake or feature-complete clone.
- Matching art/audio, weapons, UI polish, or game modes.
- Production-ready architecture.

## Requirements

- Godot **4.2+** (the project is configured for `4.2` features).

## Run It

1. Open Godot.
2. Import the project by selecting the folder `apps/remake-godot/`.
3. Press **Play**.

CLI alternative (varies by platform/package):

```bash
godot --path apps/remake-godot --run
```

## Controls

- `A/D`: move (limited fuel)
- `Left/Right`: adjust firing angle
- `Up/Down`: adjust power
- `Space`: fire
- `1/2/3`: weapon select
- `R`: reset match / regenerate terrain

## What’s Implemented

- Procedural heightmap terrain (noise + smoothing).
- Two tanks, turn-based.
- Turn timer + fuel-limited movement.
- Projectile motion with gravity.
- Wind affecting projectiles.
- Terrain collision + tank collision.
- Multiple weapons with different blast/crater tuning.
- Explosion damage with falloff radius.
- Terrain deformation via crater carving.
- Win condition (last tank alive).

## Known Limitations / Next Steps

- No wind, weapon variety, tank movement, fuel, or turn timer.
- No audio, menus, settings, input remapping, or mobile UI.
- No export presets or CI builds for the Godot project yet.

If we decide to pursue the full remake track, the next practical steps are:

1. Add movement (with slope handling) + turn flow (fuel / timer).
2. Add wind + a small set of weapons.
3. Add an export pipeline (`export_presets.cfg`) and CI artifacts for desktop first.
