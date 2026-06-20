import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGamepadInput, type GamepadSettings } from '../apps/web/src/gamepad';
import type { InputMapper, KeyCode } from '../apps/web/src/input';

// ── Test doubles ────────────────────────────────────────────────────────────

function makeMapper() {
  const calls: string[] = [];
  const held = new Map<string, Set<KeyCode>>();
  const mapper: InputMapper = {
    press: () => {},
    release: () => {},
    pressFrom: (source, code) => {
      calls.push(`press:${source}:${code}`);
      const set = held.get(source) ?? new Set<KeyCode>();
      set.add(code);
      held.set(source, set);
    },
    releaseFrom: (source, code) => {
      calls.push(`release:${source}:${code}`);
      held.get(source)?.delete(code);
    },
    releaseAllFrom: (source) => {
      calls.push(`releaseAll:${source}`);
      held.delete(source);
    },
    releaseAll: () => {},
    isPressed: () => false,
    snapshotPressed: () => [],
  };
  return { mapper, calls, held };
}

function fakeGamepad(opts: {
  buttons?: number[];
  axes?: number[];
  id?: string;
  index?: number;
}): Gamepad {
  const buttons = (opts.buttons ?? []).map(
    (v) => ({ pressed: v > 0.5, touched: false, value: v }) as GamepadButton,
  );
  return {
    id: opts.id ?? 'pad',
    index: opts.index ?? 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: opts.axes ?? [0, 0, 0, 0],
    buttons,
    hapticActuators: [],
    vibrationActuator: null,
  } as unknown as Gamepad;
}

// A controllable requestAnimationFrame: callbacks are queued and run on demand.
let rafQueue: FrameRequestCallback[] = [];
let rafId = 0;

function flushFrame() {
  const cbs = rafQueue;
  rafQueue = [];
  for (const cb of cbs) cb(performance.now());
}

let gamepadsValue: (Gamepad | null)[] = [];

beforeEach(() => {
  rafQueue = [];
  rafId = 0;
  gamepadsValue = [];
  vi.stubGlobal('navigator', {
    getGamepads: () => gamepadsValue,
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return ++rafId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createGamepadInput — support detection', () => {
  it('reports unsupported when navigator.getGamepads is absent', () => {
    vi.stubGlobal('navigator', {});
    const { mapper } = makeMapper();
    const gp = createGamepadInput(mapper);
    expect(gp.isSupported()).toBe(false);
    expect(gp.getEnabled()).toBe(false);
    expect(gp.getConnectedCount()).toBe(0);
    // setEnabled cannot enable when unsupported.
    gp.setEnabled(true);
    expect(gp.getEnabled()).toBe(false);
    gp.dispose();
  });

  it('reports supported and starts enabled when getGamepads exists', () => {
    const { mapper } = makeMapper();
    const gp = createGamepadInput(mapper);
    expect(gp.isSupported()).toBe(true);
    expect(gp.getEnabled()).toBe(true);
    gp.dispose();
  });
});

describe('createGamepadInput — tick / input mapping', () => {
  it('presses arrow keys from the d-pad and releases them when let go', () => {
    const { mapper, held } = makeMapper();
    const onStatusChange = vi.fn();
    const gp = createGamepadInput(mapper, { onStatusChange });

    // d-pad up (index 12) pressed.
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);
    // connected count changed => status change fired.
    expect(gp.getConnectedCount()).toBe(1);
    expect(onStatusChange).toHaveBeenCalled();

    // release the d-pad.
    gamepadsValue = [fakeGamepad({ buttons: [0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).not.toBe(true);
    gp.dispose();
  });

  it('maps action A/B buttons to Space/Enter via configured indices', () => {
    const { mapper, held } = makeMapper();
    const settings: Partial<GamepadSettings> = { actionAButtonIndex: 0, actionBButtonIndex: 1 };
    const gp = createGamepadInput(mapper, { getSettings: () => settings });
    gamepadsValue = [fakeGamepad({ buttons: [1, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('Space')).toBe(true);
    expect(held.get('gamepad:0')?.has('Enter')).toBe(true);
    gp.dispose();
  });

  it('applies axis hysteresis: presses past the press threshold, holds past release', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    // axisX strongly negative => ArrowLeft.
    gamepadsValue = [fakeGamepad({ axes: [-0.9, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowLeft')).toBe(true);
    // ease off but stay above release threshold (default release ~0.35).
    gamepadsValue = [fakeGamepad({ axes: [-0.4, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowLeft')).toBe(true);
    // drop below release threshold => released.
    gamepadsValue = [fakeGamepad({ axes: [-0.1, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowLeft')).not.toBe(true);
    gp.dispose();
  });

  it('positive axes map to right/down', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    gamepadsValue = [fakeGamepad({ axes: [0.9, 0.9] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowRight')).toBe(true);
    expect(held.get('gamepad:0')?.has('ArrowDown')).toBe(true);
    gp.dispose();
  });

  it('applies downward axis hysteresis once ArrowDown is already active', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    // Press down past the press threshold.
    gamepadsValue = [fakeGamepad({ axes: [0, 0.9] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowDown')).toBe(true);
    // Ease off but stay above the release threshold => prev.has('ArrowDown')
    // keeps it active (downward hysteresis branch).
    gamepadsValue = [fakeGamepad({ axes: [0, 0.4] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowDown')).toBe(true);
    gp.dispose();
  });

  it('clears a stale active index during the post-loop cleanup pass', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    // Two slots both active.
    gamepadsValue = [
      fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], index: 0 }),
      fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], index: 1 }),
    ];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);
    expect(held.get('gamepad:1')?.has('ArrowUp')).toBe(true);
    // The gamepads array SHRINKS to length 1 (index 1 no longer present at all).
    // The main loop (index < gamepads.length) never visits the stale index 1, so
    // the trailing cleanup loop is what releases it (the `!gamepads[index]` branch).
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], index: 0 })];
    flushFrame();
    expect(held.has('gamepad:1')).toBe(false);
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);
    gp.dispose();
  });

  it('drops both directions when opposing inputs are simultaneously active', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    // d-pad left (14) AND right (15) pressed => both dropped.
    const buttons = new Array(16).fill(0);
    buttons[14] = 1;
    buttons[15] = 1;
    // d-pad up (12) AND down (13) too.
    buttons[12] = 1;
    buttons[13] = 1;
    gamepadsValue = [fakeGamepad({ buttons })];
    flushFrame();
    const set = held.get('gamepad:0') ?? new Set<KeyCode>();
    expect(set.has('ArrowLeft')).toBe(false);
    expect(set.has('ArrowRight')).toBe(false);
    expect(set.has('ArrowUp')).toBe(false);
    expect(set.has('ArrowDown')).toBe(false);
    gp.dispose();
  });

  it('ignores non-finite axis values (treated as zero)', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    gamepadsValue = [fakeGamepad({ axes: [Number.NaN, Number.POSITIVE_INFINITY] })];
    flushFrame();
    expect(held.get('gamepad:0')?.size ?? 0).toBe(0);
    gp.dispose();
  });

  it('normalizes invalid settings and enforces release < press hysteresis', () => {
    const { mapper, held } = makeMapper();
    // Provide nonsense settings: out-of-range + release >= press.
    const gp = createGamepadInput(mapper, {
      getSettings: () => ({
        actionAButtonIndex: 999,
        actionBButtonIndex: Number.NaN as unknown as number,
        axisPressThreshold: 5,
        axisReleaseThreshold: 5,
      }),
    });
    // With clamped press threshold (0.95) a 0.9 axis should NOT press (below press).
    gamepadsValue = [fakeGamepad({ axes: [0.9, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowRight')).not.toBe(true);
    gp.dispose();
  });

  it('floors the release threshold at 0.05 when the press threshold is very low', () => {
    const { mapper, held } = makeMapper();
    // press clamped to 0.1; release requested >= press triggers the
    // Math.max(0.05, press - 0.1) branch where press - 0.1 = 0 < 0.05 => 0.05.
    const gp = createGamepadInput(mapper, {
      getSettings: () => ({ axisPressThreshold: 0.1, axisReleaseThreshold: 0.9 }),
    });
    // Just above press threshold (0.1) => presses.
    gamepadsValue = [fakeGamepad({ axes: [0.2, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowRight')).toBe(true);
    // Ease to 0.06: above the 0.05 release floor => still held.
    gamepadsValue = [fakeGamepad({ axes: [0.06, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowRight')).toBe(true);
    // Drop to 0.04: below the 0.05 release floor => released.
    gamepadsValue = [fakeGamepad({ axes: [0.04, 0] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowRight')).not.toBe(true);
    gp.dispose();
  });

  it('releases a gamepad slot that disappears between frames', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);
    // Slot becomes null (controller unplugged but array slot remains).
    gamepadsValue = [null];
    flushFrame();
    expect(held.has('gamepad:0')).toBe(false);
    gp.dispose();
  });

  it('does not change status when connected count is stable', () => {
    const { mapper } = makeMapper();
    const onStatusChange = vi.fn();
    const gp = createGamepadInput(mapper, { onStatusChange });
    gamepadsValue = [fakeGamepad({ buttons: [0] })];
    flushFrame();
    onStatusChange.mockClear();
    flushFrame(); // same count
    expect(onStatusChange).not.toHaveBeenCalled();
    gp.dispose();
  });
});

describe('createGamepadInput — enable/disable', () => {
  it('releases all active inputs and skips mapping while disabled', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);

    gp.setEnabled(false);
    expect(gp.getEnabled()).toBe(false);
    // setEnabled(false) immediately releases held inputs.
    expect(held.has('gamepad:0')).toBe(false);
    gp.dispose();
  });

  it('runs the disabled tick branch: releases lingering slots and reschedules', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    // Press something so activeByIndex has an entry.
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    // A fresh tick is queued (rescheduled at the end of the enabled tick). Disable
    // WITHOUT flushing so the queued tick executes the `if (!enabled)` branch.
    gp.setEnabled(false);
    expect(held.has('gamepad:0')).toBe(false);
    // Re-arm an active index by mutating through the public surface is not
    // possible while disabled; instead just run the queued disabled tick. It
    // must not throw and must keep things released.
    expect(rafQueue.length).toBeGreaterThan(0);
    flushFrame();
    expect(held.has('gamepad:0')).toBe(false);
    // Re-enabling resumes mapping.
    gp.setEnabled(true);
    expect(gp.getEnabled()).toBe(true);
    gp.dispose();
  });
});

describe('createGamepadInput — connection events', () => {
  it('logs connect/disconnect and updates status', () => {
    const { mapper, held } = makeMapper();
    const log = vi.fn();
    const onStatusChange = vi.fn();
    const gp = createGamepadInput(mapper, { log, onStatusChange });

    // jsdom does not implement GamepadEvent; emulate it with a plain Event that
    // carries the `gamepad` field the handler reads.
    const gamepadEvent = (type: string, pad: Gamepad): Event => {
      const ev = new Event(type) as Event & { gamepad: Gamepad };
      ev.gamepad = pad;
      return ev;
    };

    const pad = fakeGamepad({ id: 'X', index: 0 });
    window.dispatchEvent(gamepadEvent('gamepadconnected', pad));
    expect(log).toHaveBeenCalledWith(
      'info',
      'gamepad.connected',
      expect.objectContaining({ id: 'X' }),
    );
    expect(onStatusChange).toHaveBeenCalled();

    // Hold an input on slot 0, then disconnect it.
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);

    window.dispatchEvent(gamepadEvent('gamepaddisconnected', pad));
    expect(log).toHaveBeenCalledWith(
      'info',
      'gamepad.disconnected',
      expect.objectContaining({ id: 'X' }),
    );
    expect(held.has('gamepad:0')).toBe(false);
    gp.dispose();
  });
});

describe('createGamepadInput — dispose', () => {
  it('cancels the frame loop, removes listeners and releases inputs', () => {
    const { mapper, held } = makeMapper();
    const gp = createGamepadInput(mapper);
    gamepadsValue = [fakeGamepad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    flushFrame();
    expect(held.get('gamepad:0')?.has('ArrowUp')).toBe(true);
    gp.dispose();
    expect(held.has('gamepad:0')).toBe(false);
    // After dispose, a queued tick is a no-op.
    flushFrame();
  });
});
