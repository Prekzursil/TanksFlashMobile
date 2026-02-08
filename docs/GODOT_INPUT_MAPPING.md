# Godot Input Mapping Plan

This is the proposed input plan for the **Godot remake track**.

For now, the spike uses direct key polling (fastest to iterate). Once gameplay stabilizes, we should migrate to Godot’s
InputMap (actions) so we can support remapping and unify keyboard/gamepad/touch.

## Actions (InputMap)

Suggested action names:

- `move_left`, `move_right`
- `aim_left`, `aim_right`
- `power_up`, `power_down`
- `fire`
- `weapon_1`, `weapon_2`, `weapon_3` (or `weapon_prev`/`weapon_next`)
- `end_turn`
- `reset_match`
- `toggle_fullscreen`
- `menu_back`

## Keyboard (v1)

Baseline keyboard mapping (mirrors the current spike defaults):

- Move: `A` / `D`
- Aim angle: `Left` / `Right`
- Power: `Up` / `Down`
- Fire: `Space`
- Weapon select: `1` / `2` / `3`
- End turn: `Enter` (planned)
- Reset match: `R`
- Fullscreen: `F` (planned)
- Back/Menu: `Esc` (planned)

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

Touch should be designed around “two thumbs”:

- Left thumb: movement pad (virtual stick or D-pad)
- Right thumb: aim/power controls
  - Option A: two sliders (angle + power)
  - Option B: drag to set angle, vertical slider for power
- Fire button: large, on the right
- Weapon cycle/select: a small row of buttons or a single “cycle” button
- Pause/menu: top corner button

We should avoid “tiny” controls and support a left-handed layout from day 1.
