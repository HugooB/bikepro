import { describe, expect, it } from "vitest";
import { isRealDate } from "./dates";

describe("isRealDate", () => {
  it("accepts real dates, including leap days", () => {
    expect(isRealDate("2026-10-20")).toBe(true);
    expect(isRealDate("2028-02-29")).toBe(true);
  });

  it("rejects impossible or malformed dates", () => {
    for (const d of [
      "2026-02-29",
      "2026-02-31",
      "2025-13-01",
      "2025-00-10",
      "2026-1-5",
      "",
      "20261020",
    ]) {
      expect(isRealDate(d)).toBe(false);
    }
  });
});
