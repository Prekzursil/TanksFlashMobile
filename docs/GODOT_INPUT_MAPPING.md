# Godot Input Mapping (Current)

This document describes the current input mapping for the **Godot remake track**.

The spike now uses Godot’s InputMap actions (so keyboard + touch overlay share a single path). Remapping and gamepad
support are still follow-ups.

## Actions (InputMap)

Current action names:

- `move_left`, `move_right`
- `aim_left`, `aim_right`
- `power_up`, `power_down`
- `fire`
- `weapon_1`, `weapon_2`, `weapon_3` (or `weapon_prev`/`weapon_next`)
- `reset_match`
- `pause`

## Keyboard (v1)

Current keyboard mapping:

- Move: `A` / `D`
- Aim angle: `Left` / `Right`
- Power: `Up` / `Down`
- Fire: `Space`
- Weapon select: `1` / `2` / `3`
- Reset match: `R`
- Pause/menu: `Esc` (also `P`)

## Gamepad (v1 plan)

Target: an Xbox/PS “standard” layout that works on Windows/macOS/Linux.

- Move: Left stick `X` (left/right)
- Aim: D-pad left/right (angle), up/down (power)
- Fire: `A` / Cross
- End turn: `B` / Circle
- Weapon cycle: `X` / Square (or `LB/RB` to prev/next)
- Menu: Start
- Back: Select / View

Notes:
- Aiming is discrete and often small adjustments; the D-pad tends to feel better than an analog stick for this.
- If we add tank rotation/trajectory preview later, we can consider right stick for “fine aim”.

## Touch (mobile plan)

Touch overlay is implemented as a simple “two thumbs” layout:

- Left thumb: move buttons (left/right)
- Right thumb: aim buttons (angle +/-) + power buttons (+/-)
- Fire: large button
- Weapon select: `1` / `2` / `3` buttons

Notes:
- Enable/disable from the in-game **Settings** menu.
- Left-handed layout is supported by swapping the control clusters.
