# Porting Strategy

## Goal

Ship a modern, cross‑platform version of the classic Flash game **TANKS** with minimal friction:

- Web (baseline reference)
- Android + iOS (wrapped web build)
- Windows (desktop wrapper or PWA)

## Options considered

### Option A: Ruffle wrapper first (recommended starting point)

Use **Ruffle** (WASM Flash Player) to run the original SWF inside a modern web app, then package that web app for mobile/desktop.

**Pros**
- Fastest path to “playable nostalgia”
- Keeps gameplay/authenticity close to original
- Lets us invest early in controls, scaling, and packaging

**Cons / Risks**
- Ruffle compatibility might be incomplete for this specific SWF (graphics/audio/input quirks)
- Mobile input requires careful mapping (touch → keyboard/mouse)

### Option B: Clean-room reimplementation

Rebuild the game logic and assets (or new assets) in a cross‑platform engine (e.g., Godot), using the original only as a gameplay reference.

**Pros**
- Full control over performance, input, and UI
- No dependency on Flash emulation

**Cons**
- More time and scope risk
- Higher chance of “feels different” unless we invest heavily

## Decision (current)

Start with **Option A (Ruffle wrapper)** as the default path.

We will **pivot to Option B** only if the SWF cannot meet basic playability/compatibility requirements under Ruffle after reasonable iteration.

## Acceptance criteria (Option A)

We consider the Ruffle-wrapper approach viable if we can achieve:

1. **Boot & play**
   - Game loads reliably on desktop browsers (Chrome/Edge/Firefox).
   - No recurring fatal console errors.
2. **Controls**
   - Keyboard input is usable and consistent.
   - Mobile touch overlay can drive the same in-game actions without “stuck keys”.
3. **Rendering**
   - No major visual corruption that affects gameplay (minor differences OK).
   - Stable layout without frequent resizing glitches.
4. **Audio**
   - Audio works or can be cleanly disabled with a UI toggle (no crashes).
5. **Packaging**
   - Android/iOS wrappers run the same build and are playable at phone resolutions.
   - Windows packaging path chosen and proven with a prototype build.

## Pivot triggers (Option B)

We should consider a reimplementation spike if any of these are true:

- The game does not progress past the title/menu reliably.
- Core gameplay is broken (weapons/physics/terrain) due to emulation gaps.
- Input is fundamentally unusable on target platforms.
- Performance is unacceptable on mid-range mobile devices even after optimizations.

## Notes

Even if we start with Ruffle, we should structure wrapper code to be reusable:

- Central “input mapping” layer (keyboard/touch/gamepad)
- Scalable viewport/layout system
- Settings UI and persistence

## Current state (practical)

We are now pursuing **both tracks in parallel**:

- Wrapper track: the primary “nostalgia revival” path (Ruffle + packaging).
- Remake track: clean-room prototypes to validate scope and reduce legal friction by shipping original-free code/assets.

Remake spikes live at:

- `apps/remake-godot/` (Godot 4 spike) — see `docs/REIMPLEMENTATION_GODOT.md`
- `apps/remake-web/` (Canvas/TypeScript spike) — see `docs/REIMPLEMENTATION_WEB.md`
