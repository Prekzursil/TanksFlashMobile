# Godot Reimplementation Spike

This repo started as a **Ruffle wrapper** around the original Flash game. This document describes a *separate* effort:
a reimplementation spike in **Godot 4** to estimate scope and validate that the core gameplay loop is feasible if
Ruffle compatibility becomes a blocker.

The spike lives in `apps/remake-godot/`.

Related docs:
- Scope: `docs/REMAKE_V1_SCOPE.md`
- Input plan: `docs/GODOT_INPUT_MAPPING.md`
- Mobile exports: `docs/GODOT_MOBILE_EXPORTS.md`

## Goals (What This Spike Is For)

- Validate core artillery mechanics (aim → fire → ballistic arc → impact → damage).
- Validate destructible terrain (craters) without relying on Flash internals.
- Establish a minimal Godot project structure we can iterate on.
- Keep gameplay logic reimplemented in Godot and separate from Flash runtime code.

## Non-goals (What This Spike Is Not)

- A full remake or feature-complete clone.
- Complete art/audio parity, weapon roster parity, or full UI polish.
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

## Desktop Exports (CI)

Export presets are committed at `apps/remake-godot/export_presets.cfg`.

CI produces desktop export artifacts on Pull Requests:

- `godot-windows` (contains `Tanks.exe`)
- `godot-linux` (contains `Tanks.x86_64`)
- `godot-macos` (contains `Tanks.zip`)

Local export example:

```bash
mkdir -p output
godot --headless --path "$(pwd)/apps/remake-godot" --export-release "Windows Desktop" "$(pwd)/output/Tanks.exe"
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
- Imported original asset set for menu/tank presentation and SFX:
  - textures: `assets/original/images/char_230.png`, `char_237.png`, `char_318.png`
  - sounds: `assets/original/sounds/sound_121.mp3` (UI), `sound_35.mp3` (fire), `sound_12.mp3` (impact)
- Scripted extractor to regenerate imported assets from SWF: `scripts/extract_original_assets.mjs`

## Known Limitations / Next Steps

- Still prototype quality in gameplay depth and polish, but now uses imported original textures/audio for presentation.
- Uses Godot InputMap actions + a simple touch overlay, but there’s no remapping or gamepad support yet.
- No gameplay “nice-to-haves” yet (trajectory preview, camera tracking, terrain themes, etc.).
- Desktop exports are attached to tag-based GitHub Releases, but they’re currently unsigned/notarized.

If we decide to pursue the full remake track, the next practical steps are:

1. Add remapping and gamepad support (InputMap actions already exist).
2. Improve movement/physics feel (slopes, friction, better turn flow) and add trajectory preview.
3. Expand weapons and add wind/terrain variety.
4. Add platform polish for releases (macOS notarization, Windows signing, crash reporting, etc.).
