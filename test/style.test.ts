import { describe, expect, it } from "vitest";

import { serializeStyle } from "../src/style.js";

describe("serializeStyle", () => {
  it("kebab-cases keys and keeps numbers unitless", () => {
    expect(
      serializeStyle({ tvTextMaxLines: 2, backgroundColor: "rgba(0,0,0,0.5)" }),
    ).toBe("tv-text-max-lines: 2; background-color: rgba(0,0,0,0.5);");
  });

  it("drops null, undefined and false", () => {
    expect(
      serializeStyle({ color: null, margin: undefined, padding: false, width: 0 }),
    ).toBe("width: 0;");
  });
});
