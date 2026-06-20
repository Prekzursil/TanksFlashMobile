export type KeyCode = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Space' | 'Enter';

type KeyboardDispatchTarget = Window | Document | HTMLElement;
type InputSource = string;

const DEFAULT_SOURCE: InputSource = '__default__';

function codeToKey(code: KeyCode): string {
  switch (code) {
    case 'Space':
      return ' ';
    default:
      return code;
  }
}

function dispatchKeyboardEvent(
  target: KeyboardDispatchTarget,
  type: 'keydown' | 'keyup',
  code: KeyCode,
) {
  const key = codeToKey(code);

  // Note: keyCode/which are deprecated, but some runtimes still look at them.
  // We include them when possible.
  const keyCode =
    code === 'Enter'
      ? 13
      : code === 'Space'
        ? 32
        : code === 'ArrowLeft'
          ? 37
          : code === 'ArrowUp'
            ? 38
            : code === 'ArrowRight'
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
    Object.defineProperty(ev, 'keyCode', { value: keyCode });
    Object.defineProperty(ev, 'which', { value: keyCode });
  } catch {
    // ignore
  }

  target.dispatchEvent(ev);
}

export type InputMapper = {
  press: (code: KeyCode) => void;
  release: (code: KeyCode) => void;
  pressFrom: (source: InputSource, code: KeyCode) => void;
  releaseFrom: (source: InputSource, code: KeyCode) => void;
  releaseAllFrom: (source: InputSource) => void;
  releaseAll: () => void;
  isPressed: (code: KeyCode) => boolean;
  snapshotPressed: () => KeyCode[];
};

export function createInputMapper(getTargets: () => KeyboardDispatchTarget[]): InputMapper {
  const codesBySource = new Map<InputSource, Set<KeyCode>>();
  const sourcesByCode = new Map<KeyCode, Set<InputSource>>();

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

  function pressFrom(source: InputSource, code: KeyCode) {
    let codes = codesBySource.get(source);
    if (!codes) {
      codes = new Set<KeyCode>();
      codesBySource.set(source, codes);
    }
    if (codes.has(code)) return;
    codes.add(code);

    let sources = sourcesByCode.get(code);
    const wasPressed = Boolean(sources?.size);
    if (!sources) {
      sources = new Set<InputSource>();
      sourcesByCode.set(code, sources);
    }
    sources.add(source);

    if (!wasPressed) {
      forEachTarget((t) => dispatchKeyboardEvent(t, 'keydown', code));
    }
  }

  function releaseFrom(source: InputSource, code: KeyCode) {
    const codes = codesBySource.get(source);
    if (!codes || !codes.has(code)) return;

    codes.delete(code);
    if (codes.size === 0) codesBySource.delete(source);

    // Invariant: pressFrom always writes codesBySource and sourcesByCode
    // together, so if `codes` held this code, sourcesByCode must hold it too.
    const sources = sourcesByCode.get(code) as Set<InputSource>;
    sources.delete(source);
    if (sources.size === 0) {
      sourcesByCode.delete(code);
      forEachTarget((t) => dispatchKeyboardEvent(t, 'keyup', code));
    }
  }

  function releaseAllFrom(source: InputSource) {
    const codes = codesBySource.get(source);
    if (!codes) return;
    for (const code of [...codes]) {
      releaseFrom(source, code);
    }
  }

  function releaseAll() {
    const codes = [...sourcesByCode.keys()];
    codesBySource.clear();
    sourcesByCode.clear();
    for (const code of codes) {
      forEachTarget((t) => dispatchKeyboardEvent(t, 'keyup', code));
    }
  }

  function isPressed(code: KeyCode) {
    return Boolean(sourcesByCode.get(code)?.size);
  }

  function snapshotPressed(): KeyCode[] {
    const list = [...sourcesByCode.keys()];
    list.sort();
    return list;
  }

  return {
    press(code) {
      pressFrom(DEFAULT_SOURCE, code);
    },
    release(code) {
      releaseFrom(DEFAULT_SOURCE, code);
    },
    pressFrom,
    releaseFrom,
    releaseAllFrom,
    releaseAll() {
      releaseAll();
    },
    isPressed,
    snapshotPressed,
  };
}
