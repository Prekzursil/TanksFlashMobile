import { describe, expect, it } from "vitest";

import { format, getStrings, STRINGS } from "../src/i18n";

describe("getStrings", () => {
  it("returns the string table for the requested locale", () => {
    expect(getStrings("en")).toBe(STRINGS.en);
    expect(getStrings("en").app.title).toBe("TANKS");
  });
});

describe("format", () => {
  it("substitutes named placeholders with provided values", () => {
    expect(format("Wrapper version: {version}", { version: "1.2.3" })).toBe(
      "Wrapper version: 1.2.3",
    );
  });

  it("stringifies numeric values", () => {
    expect(format("Connected: {count} gamepads.", { count: 2 })).toBe("Connected: 2 gamepads.");
  });

  it("leaves a placeholder untouched when no matching var is supplied", () => {
    expect(format("Hello {name}", {})).toBe("Hello {name}");
  });

  it("treats a null or undefined value as missing and keeps the placeholder", () => {
    expect(format("X {a} Y {b}", { a: undefined as unknown as string, b: 0 })).toBe("X {a} Y 0");
  });

  it("replaces every occurrence of a repeated placeholder", () => {
    expect(format("{x}-{x}-{x}", { x: "q" })).toBe("q-q-q");
  });

  it("ignores text that is not a well-formed placeholder", () => {
    expect(format("no placeholders here", { a: "1" })).toBe("no placeholders here");
  });
});
