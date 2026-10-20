import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/bikes/3")).toBe("/bikes/3");
    expect(safeNextPath("/bikes/3/parts/9?log=1")).toBe("/bikes/3/parts/9?log=1");
  });

  it("keeps encoded characters as part of a local path", () => {
    expect(safeNextPath("/%0a/evil.example")).toBe("/%0a/evil.example");
  });

  it("refuses anything that could lead to another site", () => {
    for (const next of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\\/evil.example",
      "javascript:alert(1)",
      "\t//evil.example",
      "",
      undefined,
      ["/bikes/1"],
    ]) {
      const result = safeNextPath(next);
      expect(result.startsWith("/") && !result.startsWith("//")).toBe(true);
      // Whatever comes back stays on this site (an odd path just 404s).
      expect(new URL(result, "https://bikepro.test").origin).toBe("https://bikepro.test");
    }
  });
});
