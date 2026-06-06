import { describe, expect, it } from "vitest";

import { DEFAULT_STAGE_SIZE, DEFAULT_SWF_URL, STORAGE_KEYS } from "../src/config";

describe("config", () => {
  it("derives the default SWF URL from the Vite base URL", () => {
    expect(DEFAULT_SWF_URL).toContain("original/tanks.swf");
    // BASE_URL is "/" under the test runner, so the URL is rooted there.
    expect(DEFAULT_SWF_URL.endsWith("original/tanks.swf")).toBe(true);
  });

  it("exposes the 4:3 stage baseline", () => {
    expect(DEFAULT_STAGE_SIZE).toEqual({ width: 800, height: 600 });
    expect(DEFAULT_STAGE_SIZE.width / DEFAULT_STAGE_SIZE.height).toBeCloseTo(4 / 3, 5);
  });

  it("namespaces every storage key under the `tanks.` prefix and keeps them unique", () => {
    const values = Object.values(STORAGE_KEYS);
    for (const key of values) {
      expect(key.startsWith("tanks.")).toBe(true);
    }
    expect(new Set(values).size).toBe(values.length);
  });
});
