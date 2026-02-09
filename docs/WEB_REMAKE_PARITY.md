# Web Remake Gameplay Parity (vs Godot)

This checklist tracks parity between:

- Web remake: `apps/remake-web/src/main.ts`
- Godot remake: `apps/remake-godot/scripts/main.gd`

## Scope

Focused on gameplay rules only:

- weapon behavior
- turn flow
- damage model

## Parity Matrix

- Weapon stats parity: `Cannon`, `Heavy`, `Sniper` use matching blast radius, crater radius, max damage, speed multiplier, and projectile radius.
- Turn start parity: each turn resets `fuel=180`, `timer=20`, random wind in `[-240, 240]` with calm threshold `abs(wind) < 25`.
- Movement parity: A/D movement consumes `1 fuel per px`, blocked when airborne, and prevents tank overlap.
- Aim/power parity: angle clamp `5..85`, power clamp `180..900`, with matching per-second adjustment speeds.
- Fire gating parity: fire only allowed during `aim` phase when no projectile/cooldown is active and current tank is alive.
- Projectile parity: gravity and wind acceleration are applied per tick before collision checks.
- Collision parity: projectile collides with terrain and tanks using radius checks; OOB handling explodes at clamped positions.
- Damage parity: linear falloff from `maxDamage` at center to `0` at blast radius edge.
- Crater parity: crater carving uses circular deformation on terrain heightmap.
- Turn transition parity: impact cooldown `0.65s`, then switch to next alive tank or gameover.
- Timer expiry parity: when timer reaches `0`, active tank auto-fires with current angle/power/weapon.

## Runtime Phase Model

Web remake now tracks an explicit phase state aligned to Godot terminology:

- `aim`
- `firing`
- `impact`
- `gameover`

This phase state is exposed through `window.render_game_to_text()` for deterministic validation.

## Web-Only Polish Implemented

These are intentional quality improvements in the web remake and are not strict rules parity requirements:

- Aim trajectory preview (predicted ballistic path + impact marker in aim phase).
- Camera cues (shot-follow offset, brief fire cue zoom, and impact shake/zoom decay).

## Remaining Non-Parity Work

- Game mode/content parity beyond v1 rules (maps/weapons/meta progression).
- Additional feel tuning differences (animation timing and art composition balance).
