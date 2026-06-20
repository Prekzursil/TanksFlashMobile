import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTouchControls, type TouchLayout } from '../../apps/web/src/touchControls';
import type { InputMapper, KeyCode } from '../../apps/web/src/input';

// jsdom implements neither pointer capture nor PointerEvent; install minimal
// shims so the production code paths run unchanged.
beforeAll(() => {
  if (!('setPointerCapture' in Element.prototype)) {
    Element.prototype.setPointerCapture = function setPointerCapture() {};
  }
  if (!('releasePointerCapture' in Element.prototype)) {
    Element.prototype.releasePointerCapture = function releasePointerCapture() {};
  }
});

type PointerInit = {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
};

function pointerEvent(type: string, init: PointerInit = {}): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    pointerId: number;
    clientX: number;
    clientY: number;
  };
  ev.pointerId = init.pointerId ?? 1;
  ev.clientX = init.clientX ?? 0;
  ev.clientY = init.clientY ?? 0;
  return ev;
}

function makeMapper() {
  const calls: string[] = [];
  const mapper: InputMapper = {
    press: () => {},
    release: () => {},
    pressFrom: (s, c: KeyCode) => calls.push(`press:${s}:${c}`),
    releaseFrom: (s, c: KeyCode) => calls.push(`release:${s}:${c}`),
    releaseAllFrom: () => {},
    releaseAll: () => {},
    isPressed: () => false,
    snapshotPressed: () => [],
  };
  return { mapper, calls };
}

function dpadButton(root: HTMLElement, cls: string): HTMLButtonElement {
  const el = root.querySelector<HTMLButtonElement>(`.${cls}`);
  if (!el) throw new Error(`missing .${cls}`);
  return el;
}

describe('createTouchControls — structure', () => {
  it('builds the overlay with both clusters and six buttons', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    expect(tc.el.classList.contains('touchOverlay')).toBe(true);
    expect(tc.el.querySelectorAll('.touchBtn')).toHaveLength(6);
    expect(tc.el.dataset.enabled).toBe('0');
    expect(tc.el.dataset.preset).toBe('compact');
  });
});

describe('createTouchControls — button input', () => {
  let mapper: InputMapper;
  let calls: string[];
  let tc: ReturnType<typeof createTouchControls>;

  beforeEach(() => {
    ({ mapper, calls } = makeMapper());
    tc = createTouchControls(mapper);
    document.body.appendChild(tc.el);
  });

  it('presses and releases a key on pointerdown/up', () => {
    const up = dpadButton(tc.el, 'dpadUp');
    up.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    expect(up.dataset.pressed).toBe('1');
    expect(up.getAttribute('aria-pressed')).toBe('true');
    expect(calls).toContain('press:touch:up:ArrowUp');

    up.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 }));
    expect(up.dataset.pressed).toBeUndefined();
    expect(up.getAttribute('aria-pressed')).toBe('false');
    expect(calls).toContain('release:touch:up:ArrowUp');
  });

  it('only releases the key after the last pointer lifts (multi-touch)', () => {
    const a = dpadButton(tc.el, 'actionA');
    a.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    a.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2 }));
    a.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 }));
    expect(a.dataset.pressed).toBe('1'); // still held by pointer 2
    a.dispatchEvent(pointerEvent('pointerup', { pointerId: 2 }));
    expect(a.dataset.pressed).toBeUndefined();
  });

  it('releases the key on pointercancel', () => {
    const left = dpadButton(tc.el, 'dpadLeft');
    left.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    left.dispatchEvent(pointerEvent('pointercancel', { pointerId: 1 }));
    expect(left.dataset.pressed).toBeUndefined();
    expect(calls).toContain('release:touch:left:ArrowLeft');
  });

  it('releases the key when pointer capture is lost mid-press', () => {
    const right = dpadButton(tc.el, 'dpadRight');
    right.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    right.dispatchEvent(new Event('lostpointercapture', { bubbles: true }));
    expect(right.dataset.pressed).toBeUndefined();
    expect(right.getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores button pointer events while in edit mode', () => {
    tc.setEditMode(true);
    const down = dpadButton(tc.el, 'dpadDown');
    down.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    expect(down.dataset.pressed).toBeUndefined();
    // pointerup / pointercancel are also ignored while editing.
    down.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 }));
    down.dispatchEvent(pointerEvent('pointercancel', { pointerId: 1 }));
    expect(calls.filter((c) => c.startsWith('press'))).toHaveLength(0);
  });
});

describe('createTouchControls — state setters', () => {
  it('toggles enabled and clears edit/buttons when disabled', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    document.body.appendChild(tc.el);
    const up = dpadButton(tc.el, 'dpadUp');
    up.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));

    tc.setEnabled(true);
    expect(tc.el.dataset.enabled).toBe('1');

    tc.setEditMode(true);
    expect(tc.el.dataset.editing).toBe('1');

    tc.setEnabled(false);
    expect(tc.el.dataset.enabled).toBe('0');
    // disabling also exits edit mode and cancels held buttons.
    expect(tc.el.dataset.editing).toBe('0');
    expect(up.dataset.pressed).toBeUndefined();
  });

  it('swallows errors from releasePointerCapture while cancelling a held button', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    document.body.appendChild(tc.el);
    const up = dpadButton(tc.el, 'dpadUp');
    // Make releasePointerCapture throw so the cancel() try/catch is exercised.
    up.releasePointerCapture = () => {
      throw new Error('no active capture');
    };
    up.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    expect(up.dataset.pressed).toBe('1');
    // Entering edit mode cancels all buttons -> cancel() -> releasePointerCapture throws.
    expect(() => tc.setEditMode(true)).not.toThrow();
    expect(up.dataset.pressed).toBeUndefined();
  });

  it('sets the preset data attribute', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    tc.setPreset('tablet');
    expect(tc.el.dataset.preset).toBe('tablet');
  });

  it('round-trips a layout via setLayout/getLayout (returns a copy)', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    const layout: TouchLayout = { left: { x: 10, y: 20 }, right: { x: -5, y: 7 } };
    tc.setLayout(layout);
    const got = tc.getLayout();
    expect(got).toEqual(layout);
    expect(got).not.toBe(layout);
    // mutating the returned copy does not affect internal state.
    got.left.x = 999;
    expect(tc.getLayout().left.x).toBe(10);
  });

  it('applies a zero layout without a transform and a non-zero layout with one', () => {
    const { mapper } = makeMapper();
    const tc = createTouchControls(mapper);
    document.body.appendChild(tc.el);
    const leftCluster = tc.el.querySelector<HTMLDivElement>('.clusterLeft')!;
    const rightCluster = tc.el.querySelector<HTMLDivElement>('.clusterRight')!;
    tc.setLayout({ left: { x: 0, y: 0 }, right: { x: 3, y: 4 } });
    expect(leftCluster.style.transform).toBe('');
    expect(rightCluster.style.transform).toBe('translate(3px, 4px)');
  });
});

describe('createTouchControls — drag handles', () => {
  function setup() {
    const { mapper } = makeMapper();
    const onLayoutChange = (l: TouchLayout) => layouts.push(l);
    const layouts: TouchLayout[] = [];
    const tc = createTouchControls(mapper, { onLayoutChange });
    document.body.appendChild(tc.el);
    const root = tc.el;
    const handle = root.querySelector<HTMLButtonElement>('.dragHandleLeft')!;
    const cluster = root.querySelector<HTMLDivElement>('.clusterLeft')!;
    // Provide deterministic geometry: a large overlay, small cluster.
    root.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }) as DOMRect;
    cluster.getBoundingClientRect = () =>
      ({ left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 }) as DOMRect;
    return { tc, handle, cluster, layouts };
  }

  it('does nothing on handle pointerdown when not editing', () => {
    const { handle, layouts } = setup();
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 50, clientY: 50 }));
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 80, clientY: 80 }));
    expect(layouts).toHaveLength(0);
  });

  it('drags a cluster and emits clamped layout changes', () => {
    const { tc, handle, layouts } = setup();
    tc.setEditMode(true);
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 150 }));
    // move +40,+30 within bounds.
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 190, clientY: 180 }));
    expect(layouts.length).toBeGreaterThan(0);
    const last = layouts[layouts.length - 1];
    expect(last.left.x).toBe(40);
    expect(last.left.y).toBe(30);
    expect(tc.getLayout().left).toEqual({ x: 40, y: 30 });
  });

  it('ignores pointermove from a different pointer id and after pointerup', () => {
    const { tc, handle, layouts } = setup();
    tc.setEditMode(true);
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 150 }));
    // wrong pointer id => ignored.
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 2, clientX: 300, clientY: 300 }));
    expect(layouts).toHaveLength(0);
    // end with a non-matching id first (no-op), then matching id.
    handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 2 }));
    handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 }));
    // after the matching pointerup, listeners are removed: further moves do nothing.
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 250, clientY: 250 }));
    expect(layouts).toHaveLength(0);
  });

  it('stops emitting when editing is turned off mid-drag', () => {
    const { tc, handle, layouts } = setup();
    tc.setEditMode(true);
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 150 }));
    tc.setEditMode(false);
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 190, clientY: 190 }));
    expect(layouts).toHaveLength(0);
  });

  it('does not emit a duplicate when the clamped position is unchanged', () => {
    const { tc, handle, layouts } = setup();
    tc.setEditMode(true);
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 150 }));
    // A move with zero delta => next equals current => no emit.
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 150, clientY: 150 }));
    expect(layouts).toHaveLength(0);
  });

  it('clamps drag within the overlay margins', () => {
    const { tc, handle, layouts } = setup();
    tc.setEditMode(true);
    handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 150 }));
    // huge move; maxDx = right(1000) - margin(8) - clusterRight(200) = 792.
    handle.dispatchEvent(
      pointerEvent('pointermove', { pointerId: 1, clientX: 5000, clientY: 5000 }),
    );
    const last = layouts[layouts.length - 1];
    expect(last.left.x).toBe(792);
    expect(last.left.y).toBe(792);
  });
});
