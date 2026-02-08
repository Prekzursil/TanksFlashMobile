export type KeyCode = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "Enter";

type KeyboardDispatchTarget = Window | Document | HTMLElement;

function codeToKey(code: KeyCode): string {
  switch (code) {
    case "Space":
      return " ";
    default:
      return code;
  }
}

function dispatchKeyboardEvent(
  target: KeyboardDispatchTarget,
  type: "keydown" | "keyup",
  code: KeyCode,
) {
  const key = codeToKey(code);

  // Note: keyCode/which are deprecated, but some runtimes still look at them.
  // We include them when possible.
  const keyCode =
    code === "Enter"
      ? 13
      : code === "Space"
        ? 32
        : code === "ArrowLeft"
          ? 37
          : code === "ArrowUp"
            ? 38
            : code === "ArrowRight"
              ? 39
              : 40;

  const ev = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
    code,
  });

  // Some properties are readonly; best-effort define for compatibility.
  try {
    Object.defineProperty(ev, "keyCode", { value: keyCode });
    Object.defineProperty(ev, "which", { value: keyCode });
  } catch {
    // ignore
  }

  target.dispatchEvent(ev);
}

export type InputMapper = {
  press: (code: KeyCode) => void;
  release: (code: KeyCode) => void;
  releaseAll: () => void;
  isPressed: (code: KeyCode) => boolean;
};

export function createInputMapper(getTargets: () => KeyboardDispatchTarget[]): InputMapper {
  const pressed = new Set<KeyCode>();

  function uniqueTargets(): KeyboardDispatchTarget[] {
    const targets = getTargets();
    const seen = new Set<KeyboardDispatchTarget>();
    const uniq: KeyboardDispatchTarget[] = [];
    for (const t of targets) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      uniq.push(t);
    }
    return uniq;
  }

  function forEachTarget(fn: (t: KeyboardDispatchTarget) => void) {
    for (const t of uniqueTargets()) fn(t);
  }

  return {
    press(code) {
      if (pressed.has(code)) return;
      pressed.add(code);
      forEachTarget((t) => dispatchKeyboardEvent(t, "keydown", code));
    },
    release(code) {
      if (!pressed.has(code)) return;
      pressed.delete(code);
      forEachTarget((t) => dispatchKeyboardEvent(t, "keyup", code));
    },
    releaseAll() {
      for (const code of [...pressed]) {
        pressed.delete(code);
        forEachTarget((t) => dispatchKeyboardEvent(t, "keyup", code));
      }
    },
    isPressed(code) {
      return pressed.has(code);
    },
  };
}
