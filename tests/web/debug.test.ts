import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogBuffer, hookGlobalErrors, type LogLevel } from '../../apps/web/src/debug';

describe('createLogBuffer', () => {
  it('records entries with timestamp, monotonic time, level and message', () => {
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValueOnce(1000); // t0
    nowSpy.mockReturnValueOnce(1100); // first add
    const buf = createLogBuffer();
    buf.add('info', 'hello');
    const [entry] = buf.snapshot();
    expect(entry.level).toBe('info');
    expect(entry.msg).toBe('hello');
    expect(entry.tMs).toBe(100);
    expect(typeof entry.ts).toBe('string');
    expect('data' in entry).toBe(false);
    nowSpy.mockRestore();
  });

  it('clamps negative elapsed time to zero', () => {
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValueOnce(5000); // t0
    nowSpy.mockReturnValueOnce(4000); // add (clock went backwards)
    const buf = createLogBuffer();
    buf.add('warn', 'back in time');
    expect(buf.snapshot()[0].tMs).toBe(0);
    nowSpy.mockRestore();
  });

  it('attaches the data field only when data is provided', () => {
    const buf = createLogBuffer();
    buf.add('error', 'with data', { code: 42 });
    expect(buf.snapshot()[0].data).toEqual({ code: 42 });
  });

  it('evicts the oldest entries beyond maxEntries (ring buffer)', () => {
    const buf = createLogBuffer(2);
    buf.add('info', 'one');
    buf.add('info', 'two');
    buf.add('info', 'three');
    const msgs = buf.snapshot().map((e) => e.msg);
    expect(msgs).toEqual(['two', 'three']);
  });

  it('snapshot returns a copy, not the live array', () => {
    const buf = createLogBuffer();
    buf.add('info', 'x');
    const snap = buf.snapshot();
    snap.push({ ts: '', tMs: 0, level: 'info', msg: 'injected' });
    expect(buf.snapshot()).toHaveLength(1);
  });

  it('clears all entries', () => {
    const buf = createLogBuffer();
    buf.add('info', 'x');
    buf.clear();
    expect(buf.snapshot()).toHaveLength(0);
  });

  it('counts entries by level', () => {
    const buf = createLogBuffer();
    buf.add('info', 'a');
    buf.add('info', 'b');
    buf.add('warn', 'c');
    buf.add('error', 'd');
    expect(buf.counts()).toEqual({ info: 2, warn: 1, error: 1, total: 4 });
  });
});

describe('hookGlobalErrors', () => {
  const added: Array<{ level: LogLevel; msg: string; data?: unknown }> = [];
  const add = (level: LogLevel, msg: string, data?: unknown) => {
    added.push({ level, msg, data });
  };

  beforeEach(() => {
    added.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs window error events', () => {
    hookGlobalErrors(add);
    const ev = new ErrorEvent('error', {
      message: 'boom',
      filename: 'main.ts',
      lineno: 12,
      colno: 3,
    });
    window.dispatchEvent(ev);
    const errEntry = added.find((e) => e.msg === 'window.error');
    expect(errEntry).toBeDefined();
    expect(errEntry?.level).toBe('error');
    expect(errEntry?.data).toMatchObject({
      message: 'boom',
      filename: 'main.ts',
      lineno: 12,
      colno: 3,
    });
  });

  it('logs unhandled rejection with a string reason', () => {
    hookGlobalErrors(add);
    const ev = new Event('unhandledrejection') as Event & { reason?: unknown };
    ev.reason = 'string reason';
    window.dispatchEvent(ev);
    const entry = added.find((e) => e.msg === 'window.unhandledrejection');
    expect(entry?.data).toEqual({ reason: 'string reason' });
  });

  it('coerces a non-string rejection reason to a string', () => {
    hookGlobalErrors(add);
    const ev = new Event('unhandledrejection') as Event & { reason?: unknown };
    ev.reason = new Error('exploded');
    window.dispatchEvent(ev);
    const entry = added.find((e) => e.msg === 'window.unhandledrejection');
    expect(entry?.data).toEqual({ reason: 'Error: exploded' });
  });
});
