import type { InputMapper, KeyCode } from './input';

export type GamepadInput = {
  isSupported: () => boolean;
  getEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  getConnectedCount: () => number;
  dispose: () => void;
};

export type GamepadSettings = {
  actionAButtonIndex: number;
  actionBButtonIndex: number;
  axisPressThreshold: number;
  axisReleaseThreshold: number;
};

export type GamepadInputOptions = {
  onStatusChange?: () => void;
  log?: (level: 'info' | 'warn' | 'error', msg: string, data?: unknown) => void;
  getSettings?: () => Partial<GamepadSettings>;
};

const DEFAULT_SETTINGS: GamepadSettings = {
  actionAButtonIndex: 0,
  actionBButtonIndex: 1,
  axisPressThreshold: 0.45,
  axisReleaseThreshold: 0.35,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeSettings(raw: Partial<GamepadSettings> | undefined): GamepadSettings {
  const actionAButtonIndex = clampInt(
    raw?.actionAButtonIndex,
    0,
    15,
    DEFAULT_SETTINGS.actionAButtonIndex,
  );
  const actionBButtonIndex = clampInt(
    raw?.actionBButtonIndex,
    0,
    15,
    DEFAULT_SETTINGS.actionBButtonIndex,
  );
  const axisPressThreshold = clampNumber(
    raw?.axisPressThreshold,
    0.1,
    0.95,
    DEFAULT_SETTINGS.axisPressThreshold,
  );
  let axisReleaseThreshold = clampNumber(
    raw?.axisReleaseThreshold,
    0.05,
    0.9,
    DEFAULT_SETTINGS.axisReleaseThreshold,
  );

  // Ensure hysteresis; release threshold must be below press threshold.
  if (axisReleaseThreshold >= axisPressThreshold) {
    axisReleaseThreshold = Math.max(0.05, axisPressThreshold - 0.1);
  }

  // Keep at least a tiny gap so we don't thrash on the boundary.
  axisReleaseThreshold = Math.min(axisReleaseThreshold, axisPressThreshold - 0.01);

  return {
    actionAButtonIndex,
    actionBButtonIndex,
    axisPressThreshold,
    axisReleaseThreshold,
  };
}

function getAxis(gamepad: Gamepad, index: number): number {
  const v = gamepad.axes?.[index];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return v;
}

function buttonPressed(gamepad: Gamepad, index: number): boolean {
  return Boolean(gamepad.buttons?.[index]?.pressed);
}

function axisNegativeActive(
  value: number,
  wasActive: boolean,
  pressThreshold: number,
  releaseThreshold: number,
): boolean {
  if (wasActive) return value < -releaseThreshold;
  return value < -pressThreshold;
}

function axisPositiveActive(
  value: number,
  wasActive: boolean,
  pressThreshold: number,
  releaseThreshold: number,
): boolean {
  if (wasActive) return value > releaseThreshold;
  return value > pressThreshold;
}

function computeDesired(
  gamepad: Gamepad,
  prev: Set<KeyCode>,
  settings: GamepadSettings,
): Set<KeyCode> {
  const out = new Set<KeyCode>();

  const dpadUp = buttonPressed(gamepad, 12);
  const dpadDown = buttonPressed(gamepad, 13);
  const dpadLeft = buttonPressed(gamepad, 14);
  const dpadRight = buttonPressed(gamepad, 15);

  const axisX = getAxis(gamepad, 0);
  const axisY = getAxis(gamepad, 1);

  const pressThreshold = settings.axisPressThreshold;
  const releaseThreshold = settings.axisReleaseThreshold;

  let left =
    dpadLeft ||
    axisNegativeActive(
      axisX,
      prev.has('ArrowLeft') && !prev.has('ArrowRight') && !dpadRight,
      pressThreshold,
      releaseThreshold,
    );
  let right =
    dpadRight ||
    axisPositiveActive(
      axisX,
      prev.has('ArrowRight') && !prev.has('ArrowLeft') && !dpadLeft,
      pressThreshold,
      releaseThreshold,
    );
  let up =
    dpadUp ||
    axisNegativeActive(
      axisY,
      prev.has('ArrowUp') && !prev.has('ArrowDown') && !dpadDown,
      pressThreshold,
      releaseThreshold,
    );
  let down =
    dpadDown ||
    axisPositiveActive(
      axisY,
      prev.has('ArrowDown') && !prev.has('ArrowUp') && !dpadUp,
      pressThreshold,
      releaseThreshold,
    );

  // If both directions are active (stick + dpad disagreement, or jitter), drop both.
  if (left && right) {
    left = false;
    right = false;
  }
  if (up && down) {
    up = false;
    down = false;
  }

  if (left) out.add('ArrowLeft');
  if (right) out.add('ArrowRight');
  if (up) out.add('ArrowUp');
  if (down) out.add('ArrowDown');

  if (buttonPressed(gamepad, settings.actionAButtonIndex)) out.add('Space');
  if (buttonPressed(gamepad, settings.actionBButtonIndex)) out.add('Enter');

  return out;
}

function countConnected(gamepads: (Gamepad | null | undefined)[]): number {
  let count = 0;
  for (const gp of gamepads) if (gp) count++;
  return count;
}

export function createGamepadInput(
  input: InputMapper,
  options: GamepadInputOptions = {},
): GamepadInput {
  const supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';

  let enabled = supported;
  let disposed = false;
  let rafId = 0;
  let connected = 0;

  const activeByIndex = new Map<number, Set<KeyCode>>();

  function emitStatusChange() {
    options.onStatusChange?.();
  }

  function updateConnectedCount(gamepads: (Gamepad | null | undefined)[]) {
    const next = countConnected(gamepads);
    if (next === connected) return;
    connected = next;
    emitStatusChange();
  }

  function sourceId(index: number): string {
    return `gamepad:${index}`;
  }

  function releaseIndex(index: number) {
    input.releaseAllFrom(sourceId(index));
    activeByIndex.delete(index);
  }

  function tick() {
    if (disposed) return;

    // tick() is only ever scheduled from within the `if (supported)` start block
    // (or re-scheduled from inside tick itself), so `supported` is invariantly
    // true here and navigator.getGamepads is guaranteed to exist.
    const gamepads = Array.from(navigator.getGamepads());
    updateConnectedCount(gamepads);

    const settings = normalizeSettings(options.getSettings?.());

    if (!enabled) {
      // Nothing to release here: setEnabled(false) is the only path that clears
      // `enabled`, and it already releases every active index, so activeByIndex
      // is guaranteed empty while disabled. The disabled tick just keeps the
      // rAF loop alive so re-enabling resumes seamlessly.
      rafId = window.requestAnimationFrame(tick);
      return;
    }

    for (let index = 0; index < gamepads.length; index++) {
      const gp = gamepads[index];
      if (!gp) {
        if (activeByIndex.has(index)) releaseIndex(index);
        continue;
      }

      const prev = activeByIndex.get(index) ?? new Set<KeyCode>();
      const desired = computeDesired(gp, prev, settings);
      const source = sourceId(index);

      for (const code of desired) {
        if (prev.has(code)) continue;
        input.pressFrom(source, code);
      }
      for (const code of prev) {
        if (desired.has(code)) continue;
        input.releaseFrom(source, code);
      }

      activeByIndex.set(index, desired);
    }

    for (const index of [...activeByIndex.keys()]) {
      if (!gamepads[index]) releaseIndex(index);
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function onConnected(ev: GamepadEvent) {
    options.log?.('info', 'gamepad.connected', {
      id: ev.gamepad.id,
      index: ev.gamepad.index,
      mapping: ev.gamepad.mapping,
    });
    emitStatusChange();
  }

  function onDisconnected(ev: GamepadEvent) {
    options.log?.('info', 'gamepad.disconnected', {
      id: ev.gamepad.id,
      index: ev.gamepad.index,
      mapping: ev.gamepad.mapping,
    });
    releaseIndex(ev.gamepad.index);
    emitStatusChange();
  }

  if (supported) {
    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);
    rafId = window.requestAnimationFrame(tick);
  }

  return {
    isSupported() {
      return supported;
    },
    getEnabled() {
      return enabled;
    },
    setEnabled(next) {
      enabled = Boolean(next) && supported;
      if (!enabled) {
        for (const index of [...activeByIndex.keys()]) releaseIndex(index);
      }
      emitStatusChange();
    },
    getConnectedCount() {
      return connected;
    },
    dispose() {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnected);
      window.removeEventListener('gamepaddisconnected', onDisconnected);
      for (const index of [...activeByIndex.keys()]) releaseIndex(index);
    },
  };
}
