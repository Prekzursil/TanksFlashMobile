import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInputMapper, type KeyCode } from '../../apps/web/src/input';

type Captured = { type: string; code: string; key: string; keyCode: number; which: number };

function makeTarget() {
  const el = document.createElement('div');
  const events: Captured[] = [];
  el.addEventListener('keydown', (e) => events.push(snap(e)));
  el.addEventListener('keyup', (e) => events.push(snap(e)));
  return { el, events };
}

function snap(e: Event): Captured {
  const ke = e as KeyboardEvent;
  return {
    type: ke.type,
    code: ke.code,
    key: ke.key,
    keyCode: ke.keyCode,
    which: (ke as KeyboardEvent & { which: number }).which,
  };
}

describe('createInputMapper', () => {
  let target: ReturnType<typeof makeTarget>;

  beforeEach(() => {
    target = makeTarget();
  });

  it('dispatches keydown/keyup for the default source', () => {
    const m = createInputMapper(() => [target.el]);
    m.press('ArrowUp');
    expect(m.isPressed('ArrowUp')).toBe(true);
    m.release('ArrowUp');
    expect(m.isPressed('ArrowUp')).toBe(false);
    expect(target.events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });

  it('maps Space to the space key with keyCode 32', () => {
    const m = createInputMapper(() => [target.el]);
    m.press('Space');
    const ev = target.events[0];
    expect(ev.key).toBe(' ');
    expect(ev.code).toBe('Space');
    expect(ev.keyCode).toBe(32);
    expect(ev.which).toBe(32);
  });

  it('assigns the correct legacy keyCode for every key code', () => {
    const cases: Array<[KeyCode, number, string]> = [
      ['Enter', 13, 'Enter'],
      ['ArrowLeft', 37, 'ArrowLeft'],
      ['ArrowUp', 38, 'ArrowUp'],
      ['ArrowRight', 39, 'ArrowRight'],
      ['ArrowDown', 40, 'ArrowDown'],
    ];
    for (const [code, expected, key] of cases) {
      const t = makeTarget();
      const m = createInputMapper(() => [t.el]);
      m.press(code);
      expect(t.events[0].keyCode).toBe(expected);
      expect(t.events[0].key).toBe(key);
    }
  });

  it('falls back gracefully when defineProperty throws', () => {
    // Build everything BEFORE mocking so jsdom (which uses Object.defineProperty
    // internally) is untouched; the mock only needs to be active during dispatch.
    const m = createInputMapper(() => [target.el]);
    const realDefineProperty = Object.defineProperty;
    const spy = vi.spyOn(Object, 'defineProperty').mockImplementation(((
      ...args: Parameters<typeof Object.defineProperty>
    ) => {
      if (args[1] === 'keyCode' || args[1] === 'which') {
        throw new Error('frozen');
      }
      return realDefineProperty(...args);
    }) as typeof Object.defineProperty);
    try {
      expect(() => m.press('ArrowUp')).not.toThrow();
      expect(target.events).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('ref-counts presses across sources: keydown once, keyup only after last release', () => {
    const m = createInputMapper(() => [target.el]);
    m.pressFrom('a', 'ArrowLeft');
    m.pressFrom('b', 'ArrowLeft');
    // Second press from a different source does NOT re-emit keydown.
    expect(target.events.filter((e) => e.type === 'keydown')).toHaveLength(1);
    m.releaseFrom('a', 'ArrowLeft');
    expect(target.events.filter((e) => e.type === 'keyup')).toHaveLength(0);
    m.releaseFrom('b', 'ArrowLeft');
    expect(target.events.filter((e) => e.type === 'keyup')).toHaveLength(1);
  });

  it('pressFrom is idempotent for the same source+code', () => {
    const m = createInputMapper(() => [target.el]);
    m.pressFrom('a', 'ArrowUp');
    m.pressFrom('a', 'ArrowUp');
    expect(target.events.filter((e) => e.type === 'keydown')).toHaveLength(1);
  });

  it('releaseFrom is a no-op for an unknown source or code', () => {
    const m = createInputMapper(() => [target.el]);
    m.releaseFrom('ghost', 'ArrowUp'); // unknown source
    m.pressFrom('a', 'ArrowUp');
    m.releaseFrom('a', 'ArrowDown'); // known source, wrong code
    expect(target.events.filter((e) => e.type === 'keyup')).toHaveLength(0);
  });

  it('releaseFrom on a code with no source set returns early', () => {
    const m = createInputMapper(() => [target.el]);
    // Force a source map entry whose code is not in sourcesByCode is unreachable
    // via the public API; instead exercise the guard by releasing a code that was
    // never pressed from a source that exists for another code.
    m.pressFrom('a', 'ArrowUp');
    m.releaseFrom('a', 'ArrowUp');
    m.releaseFrom('a', 'ArrowUp'); // already removed
    expect(target.events.filter((e) => e.type === 'keyup')).toHaveLength(1);
  });

  it('releaseAllFrom releases every code held by a source', () => {
    const m = createInputMapper(() => [target.el]);
    m.pressFrom('a', 'ArrowUp');
    m.pressFrom('a', 'ArrowDown');
    m.releaseAllFrom('a');
    expect(m.snapshotPressed()).toEqual([]);
    m.releaseAllFrom('a'); // no-op second time
  });

  it('releaseAll releases all codes from all sources', () => {
    const m = createInputMapper(() => [target.el]);
    m.pressFrom('a', 'ArrowUp');
    m.pressFrom('b', 'ArrowDown');
    m.releaseAll();
    expect(m.snapshotPressed()).toEqual([]);
    expect(target.events.filter((e) => e.type === 'keyup')).toHaveLength(2);
  });

  it('snapshotPressed returns a sorted list of held codes', () => {
    const m = createInputMapper(() => [target.el]);
    m.press('ArrowUp');
    m.press('ArrowDown');
    m.press('ArrowLeft');
    expect(m.snapshotPressed()).toEqual(['ArrowDown', 'ArrowLeft', 'ArrowUp']);
  });

  it('deduplicates targets and skips falsy targets', () => {
    const a = makeTarget();
    const m = createInputMapper(() => [a.el, a.el, null as unknown as HTMLElement]);
    m.press('ArrowUp');
    // a.el listed twice + a null, but keydown dispatched only once.
    expect(a.events.filter((e) => e.type === 'keydown')).toHaveLength(1);
  });
});
