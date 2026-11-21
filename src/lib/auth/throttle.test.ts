import { describe, expect, it } from "vitest";
import { clearFailures, isThrottled, recordFailure, trackedCount } from "./throttle";

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

  it("caps how many emails it tracks, dropping expired and then oldest entries", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < 10; i++) recordFailure("victim@example.com", t0);
    for (let i = 0; i < 20_000; i++) recordFailure(`flood${i}@example.com`, t0);
    expect(trackedCount()).toBeLessThanOrEqual(10_000);
    // The newest entries are kept.
    for (let i = 0; i < 10; i++) recordFailure("recent@example.com", t0);
    expect(isThrottled("recent@example.com", t0)).toBe(true);

    // Once the window has passed, expired entries make room before any live one is dropped.
    const t1 = t0 + 15 * 60 * 1000 + 1;
    for (let i = 0; i < 10; i++) recordFailure("later@example.com", t1);
    expect(trackedCount()).toBe(1);
    expect(isThrottled("later@example.com", t1)).toBe(true);
  });
});
