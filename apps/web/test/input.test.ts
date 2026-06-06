import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInputMapper, type KeyCode } from "../src/input";

type Captured = { type: string; code: string; key: string; keyCode: number };

function makeTarget(): { el: HTMLElement; events: Captured[] } {
  const el = document.createElement("div");
  const events: Captured[] = [];
  for (const type of ["keydown", "keyup"]) {
    el.addEventListener(type, (raw) => {
      const ev = raw as KeyboardEvent;
      events.push({
        type: ev.type,
        code: ev.code,
        key: ev.key,
        keyCode: (ev as KeyboardEvent & { keyCode: number }).keyCode,
      });
    });
  }
  return { el, events };
}

describe("createInputMapper", () => {
  let target: ReturnType<typeof makeTarget>;

  beforeEach(() => {
    target = makeTarget();
  });

  it("dispatches keydown on press and keyup on release", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press("ArrowUp");
    mapper.release("ArrowUp");
    expect(target.events.map((e) => e.type)).toEqual(["keydown", "keyup"]);
    expect(target.events[0].code).toBe("ArrowUp");
    expect(target.events[0].keyCode).toBe(38);
  });

  it("maps Space to the ' ' key with keyCode 32", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press("Space");
    expect(target.events[0].key).toBe(" ");
    expect(target.events[0].keyCode).toBe(32);
  });

  it.each<[KeyCode, number]>([
    ["Enter", 13],
    ["ArrowLeft", 37],
    ["ArrowUp", 38],
    ["ArrowRight", 39],
    ["ArrowDown", 40],
  ])("uses the legacy keyCode %s -> %d", (code, expected) => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press(code);
    expect(target.events[0].keyCode).toBe(expected);
  });

  it("is idempotent: a second press from the same source emits no extra keydown", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press("ArrowLeft");
    mapper.press("ArrowLeft");
    expect(target.events.filter((e) => e.type === "keydown")).toHaveLength(1);
    expect(mapper.isPressed("ArrowLeft")).toBe(true);
  });

  it("reference-counts across sources: keyup only fires when the last source releases", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.pressFrom("touch", "ArrowRight");
    mapper.pressFrom("gamepad", "ArrowRight");
    // Only one keydown despite two sources.
    expect(target.events.filter((e) => e.type === "keydown")).toHaveLength(1);

    mapper.releaseFrom("touch", "ArrowRight");
    expect(target.events.filter((e) => e.type === "keyup")).toHaveLength(0);

    mapper.releaseFrom("gamepad", "ArrowRight");
    expect(target.events.filter((e) => e.type === "keyup")).toHaveLength(1);
  });

  it("releaseFrom is a no-op for an unknown source or code", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.releaseFrom("ghost", "ArrowUp");
    mapper.pressFrom("a", "ArrowUp");
    mapper.releaseFrom("a", "ArrowDown");
    expect(target.events.filter((e) => e.type === "keyup")).toHaveLength(0);
  });

  it("releaseAllFrom releases every code held by a source", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.pressFrom("touch", "ArrowUp");
    mapper.pressFrom("touch", "ArrowDown");
    mapper.releaseAllFrom("touch");
    expect(mapper.isPressed("ArrowUp")).toBe(false);
    expect(mapper.isPressed("ArrowDown")).toBe(false);
  });

  it("releaseAllFrom is a no-op for an unknown source", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.releaseAllFrom("nobody");
    expect(target.events).toHaveLength(0);
  });

  it("releaseAll clears every pressed code and emits a keyup per code", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press("ArrowUp");
    mapper.pressFrom("touch", "ArrowDown");
    mapper.releaseAll();
    expect(mapper.snapshotPressed()).toEqual([]);
    expect(target.events.filter((e) => e.type === "keyup")).toHaveLength(2);
  });

  it("snapshotPressed returns a sorted list of held codes", () => {
    const mapper = createInputMapper(() => [target.el]);
    mapper.press("ArrowUp");
    mapper.press("ArrowDown");
    expect(mapper.snapshotPressed()).toEqual(["ArrowDown", "ArrowUp"]);
  });

  it("swallows errors when keyCode/which cannot be defined on the event", () => {
    const realDefineProperty = Object.defineProperty;
    const spy = vi.spyOn(Object, "defineProperty").mockImplementation((obj, prop, descriptor) => {
      // Simulate a runtime where defining the legacy keyCode/which throws.
      if (prop === "keyCode" || prop === "which") {
        throw new TypeError("readonly");
      }
      return realDefineProperty(obj, prop, descriptor);
    });
    try {
      const mapper = createInputMapper(() => [target.el]);
      // Must not throw despite defineProperty failing inside the dispatcher.
      expect(() => mapper.press("ArrowUp")).not.toThrow();
      expect(target.events[0].type).toBe("keydown");
    } finally {
      spy.mockRestore();
    }
  });

  it("de-duplicates repeated and falsy targets", () => {
    const second = makeTarget();
    const mapper = createInputMapper(() => [
      target.el,
      target.el,
      second.el,
      null as unknown as HTMLElement,
    ]);
    mapper.press("Enter");
    expect(target.events.filter((e) => e.type === "keydown")).toHaveLength(1);
    expect(second.events.filter((e) => e.type === "keydown")).toHaveLength(1);
  });
});
