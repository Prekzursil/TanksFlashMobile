# Remake v1 Scope (Godot)

This document defines what we mean by “v1” for the **clean-room Godot remake track**.

It is intentionally scoped so we can ship a playable build without getting trapped in “perfect parity” work.

Related:
- Spike overview: `docs/REIMPLEMENTATION_GODOT.md`
- Input plan: `docs/GODOT_INPUT_MAPPING.md`

## Principles

- **Clean-room**: do not reuse SWF internals, decompiled logic, or extracted assets.
- **Same feel, not identical**: match the *gameplay loop* first; visual polish comes later.
- **Desktop-first**: stabilize a Windows/macOS/Linux build pipeline before mobile UX work.
- **Small, testable increments**: each PR should add a measurable slice of gameplay or tooling.

## Must-have (v1)

Gameplay
- Local 1v1, turn-based.
- Movement with **fuel** limits.
- Aim control (angle + power) and projectile ballistics (gravity).
- **Wind** affecting shots.
- Destructible terrain (craters).
- At least **2 weapons** with meaningfully different behavior.
- Damage and win condition (last tank alive).
- Basic turn constraints: **turn timer** and/or explicit end-turn.

UX
- Keyboard controls with an in-game hint/help.
- Reset match.
- Minimal HUD (HP, weapon, wind, fuel, timer).

Tech
- Godot 4 project layout under `apps/remake-godot/`.
- Placeholder visuals (shapes) and simple SFX are fine.

## Out of scope (v1)

- Multiplayer (online) or matchmaking.
- AI opponents / campaign.
- Pixel-perfect original art/audio parity.
- Store/publishing features (achievements, IAP, analytics).
- Fancy terrain (water/props), particle FX, or advanced physics.

## Acceptance Criteria

We can call “v1” done when:

- A desktop export is playable start-to-finish (2 players, multiple turns, win condition).
- No obvious soft-locks (timer/fuel/turn flow can’t get stuck).
- Performance is stable (target: 60fps on a mid-range desktop).
- Clear instructions exist for controls + how to run/build.

## Next Milestones (Suggested)

1. v1-alpha: core loop + 2 weapons + stable turn flow.
2. v1-beta: UI/menu polish + audio + basic settings.
3. v1: export pipeline + CI artifacts + first tagged release for desktop.
