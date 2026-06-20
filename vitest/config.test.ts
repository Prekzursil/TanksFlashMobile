import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE_SIZE, DEFAULT_SWF_URL, STORAGE_KEYS } from '../apps/web/src/config';

describe('config', () => {
  it('derives the default SWF URL from the Vite base URL', () => {
    expect(DEFAULT_SWF_URL).toBe(`${import.meta.env.BASE_URL}original/tanks.swf`);
    expect(DEFAULT_SWF_URL.endsWith('original/tanks.swf')).toBe(true);
  });

  it('exposes the baseline stage size', () => {
    expect(DEFAULT_STAGE_SIZE).toEqual({ width: 800, height: 600 });
  });

  it('namespaces every storage key under the tanks.* prefix', () => {
    const keys = Object.values(STORAGE_KEYS);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.startsWith('tanks.')).toBe(true);
    }
    // Keys are unique.
    expect(new Set(keys).size).toBe(keys.length);
  });
});
