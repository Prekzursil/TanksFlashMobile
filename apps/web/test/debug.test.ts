import { describe, expect, it, vi } from "vitest";

import { createLogBuffer, hookGlobalErrors, type LogLevel } from "../src/debug";

describe("createLogBuffer", () => {
  it("records entries with monotonic, non-negative timestamps", () => {
    const buf = createLogBuffer();
    buf.add("info", "hello");
    const [entry] = buf.snapshot();
    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("hello");
    expect(entry.tMs).toBeGreaterThanOrEqual(0);
    expect(typeof entry.ts).toBe("string");
  });

  it("omits the data field when none is supplied and includes it otherwise", () => {
    const buf = createLogBuffer();
    buf.add("info", "no-data");
    buf.add("warn", "with-data", { code: 42 });
    const [a, b] = buf.snapshot();
    expect("data" in a).toBe(false);
    expect(b.data).toEqual({ code: 42 });
  });

  it("evicts the oldest entries once maxEntries is exceeded", () => {
    const buf = createLogBuffer(2);
    buf.add("info", "1");
    buf.add("info", "2");
    buf.add("info", "3");
    const snap = buf.snapshot();
    expect(snap.map((e) => e.msg)).toEqual(["2", "3"]);
  });

  it("returns a defensive copy from snapshot", () => {
    const buf = createLogBuffer();
    buf.add("info", "x");
    const snap = buf.snapshot();
    snap.pop();
    expect(buf.snapshot()).toHaveLength(1);
  });

  it("clears all entries", () => {
    const buf = createLogBuffer();
    buf.add("info", "x");
    buf.clear();
    expect(buf.snapshot()).toHaveLength(0);
  });

  it("counts entries per level", () => {
    const buf = createLogBuffer();
    const levels: LogLevel[] = ["info", "info", "warn", "error"];
    for (const level of levels) buf.add(level, level);
    expect(buf.counts()).toEqual({ info: 2, warn: 1, error: 1, total: 4 });
  });
});

describe("hookGlobalErrors", () => {
  it("forwards window 'error' events to the sink", () => {
    const add = vi.fn();
    hookGlobalErrors(add);
    const ev = new ErrorEvent("error", {
      message: "boom",
      filename: "a.js",
      lineno: 1,
      colno: 2,
    });
    window.dispatchEvent(ev);
    expect(add).toHaveBeenCalledWith("error", "window.error", {
      message: "boom",
      filename: "a.js",
      lineno: 1,
      colno: 2,
    });
  });

  it("forwards string rejection reasons verbatim", () => {
    const add = vi.fn();
    hookGlobalErrors(add);
    const ev = new Event("unhandledrejection") as Event & { reason: unknown };
    ev.reason = "nope";
    window.dispatchEvent(ev);
    expect(add).toHaveBeenCalledWith("error", "window.unhandledrejection", { reason: "nope" });
  });

  it("stringifies non-string rejection reasons", () => {
    const add = vi.fn();
    hookGlobalErrors(add);
    const ev = new Event("unhandledrejection") as Event & { reason: unknown };
    ev.reason = new Error("kaboom");
    window.dispatchEvent(ev);
    expect(add).toHaveBeenCalledWith("error", "window.unhandledrejection", {
      reason: "Error: kaboom",
    });
  });
});
