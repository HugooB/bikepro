import { describe, expect, it } from "vitest";
import { clearFailures, isThrottled, recordFailure } from "./throttle";

describe("sign-in throttle", () => {
  it("blocks after 10 failures and lifts after 15 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 9; i++) recordFailure("a@example.com", t0);
    expect(isThrottled("a@example.com", t0)).toBe(false);
    recordFailure("a@example.com", t0);
    expect(isThrottled("a@example.com", t0)).toBe(true);
    expect(isThrottled("b@example.com", t0)).toBe(false);
    expect(isThrottled("a@example.com", t0 + 15 * 60 * 1000 + 1)).toBe(false);
  });

  it("resets after a successful sign-in", () => {
    for (let i = 0; i < 10; i++) recordFailure("c@example.com");
    clearFailures("c@example.com");
    expect(isThrottled("c@example.com")).toBe(false);
  });
});
