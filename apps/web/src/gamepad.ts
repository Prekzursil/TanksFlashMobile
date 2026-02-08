import type { InputMapper, KeyCode } from "./input";

export type GamepadInput = {
  isSupported: () => boolean;
  getEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  getConnectedCount: () => number;
  dispose: () => void;
};

export type GamepadInputOptions = {
  onStatusChange?: () => void;
  log?: (level: "info" | "warn" | "error", msg: string, data?: unknown) => void;
};

const AXIS_PRESS_THRESHOLD = 0.45;
const AXIS_RELEASE_THRESHOLD = 0.35;

function getAxis(gamepad: Gamepad, index: number): number {
  const v = gamepad.axes?.[index];
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return v;
}

function buttonPressed(gamepad: Gamepad, index: number): boolean {
  return Boolean(gamepad.buttons?.[index]?.pressed);
}

function axisNegativeActive(value: number, wasActive: boolean): boolean {
  if (wasActive) return value < -AXIS_RELEASE_THRESHOLD;
  return value < -AXIS_PRESS_THRESHOLD;
}

function axisPositiveActive(value: number, wasActive: boolean): boolean {
  if (wasActive) return value > AXIS_RELEASE_THRESHOLD;
  return value > AXIS_PRESS_THRESHOLD;
}

function computeDesired(gamepad: Gamepad, prev: Set<KeyCode>): Set<KeyCode> {
  const out = new Set<KeyCode>();

  const dpadUp = buttonPressed(gamepad, 12);
  const dpadDown = buttonPressed(gamepad, 13);
  const dpadLeft = buttonPressed(gamepad, 14);
  const dpadRight = buttonPressed(gamepad, 15);

  const axisX = getAxis(gamepad, 0);
  const axisY = getAxis(gamepad, 1);

  let left =
    dpadLeft ||
    axisNegativeActive(axisX, prev.has("ArrowLeft") && !prev.has("ArrowRight") && !dpadRight);
  let right =
    dpadRight ||
    axisPositiveActive(axisX, prev.has("ArrowRight") && !prev.has("ArrowLeft") && !dpadLeft);
  let up =
    dpadUp ||
    axisNegativeActive(axisY, prev.has("ArrowUp") && !prev.has("ArrowDown") && !dpadDown);
  let down =
    dpadDown ||
    axisPositiveActive(axisY, prev.has("ArrowDown") && !prev.has("ArrowUp") && !dpadUp);

  // If both directions are active (stick + dpad disagreement, or jitter), drop both.
  if (left && right) {
    left = false;
    right = false;
  }
  if (up && down) {
    up = false;
    down = false;
  }

  if (left) out.add("ArrowLeft");
  if (right) out.add("ArrowRight");
  if (up) out.add("ArrowUp");
  if (down) out.add("ArrowDown");

  // Standard mapping:
  // - Button 0 (bottom) => Action A (Space)
  // - Button 1 (right)  => Action B (Enter)
  if (buttonPressed(gamepad, 0)) out.add("Space");
  if (buttonPressed(gamepad, 1)) out.add("Enter");

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
  const supported = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";

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

    const gamepads = supported ? Array.from(navigator.getGamepads()) : [];
    updateConnectedCount(gamepads);

    if (!enabled) {
      for (const index of [...activeByIndex.keys()]) releaseIndex(index);
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
      const desired = computeDesired(gp, prev);
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
    options.log?.("info", "gamepad.connected", {
      id: ev.gamepad.id,
      index: ev.gamepad.index,
      mapping: ev.gamepad.mapping,
    });
    emitStatusChange();
  }

  function onDisconnected(ev: GamepadEvent) {
    options.log?.("info", "gamepad.disconnected", {
      id: ev.gamepad.id,
      index: ev.gamepad.index,
      mapping: ev.gamepad.mapping,
    });
    releaseIndex(ev.gamepad.index);
    emitStatusChange();
  }

  if (supported) {
    window.addEventListener("gamepadconnected", onConnected);
    window.addEventListener("gamepaddisconnected", onDisconnected);
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
      window.removeEventListener("gamepadconnected", onConnected);
      window.removeEventListener("gamepaddisconnected", onDisconnected);
      for (const index of [...activeByIndex.keys()]) releaseIndex(index);
    },
  };
}
