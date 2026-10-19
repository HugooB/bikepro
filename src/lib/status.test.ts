import { describe, expect, it } from "vitest";
import { computeStatus } from "./status";

const now = new Date(2026, 9, 19, 12, 0); // 19 Oct 2026

const chain = {
  installedAt: "2026-06-19",
  installedKm: 6000,
  intervalKm: 3000,
  intervalDays: 365,
};

describe("computeStatus", () => {
  it("is ok when well within the interval", () => {
    const s = computeStatus(chain, null, 7500, now);
    expect(s.level).toBe("ok");
    expect(s.ratio).toBeCloseTo(1500 / 3000);
    expect(s.hint).toBe("Due in 1,500 km");
  });

  it("turns due soon at 75% of the interval", () => {
    expect(computeStatus(chain, null, 8249, now).level).toBe("ok");
    expect(computeStatus(chain, null, 8250, now).level).toBe("due");
  });

  it("is overdue past the interval and says by how much", () => {
    const s = computeStatus(chain, null, 9320, now);
    expect(s.level).toBe("overdue");
    expect(s.hint).toBe("Overdue by 320 km");
  });

  it("uses whichever of km or time is furthest along", () => {
    // Barely ridden, but installed 13 months ago with a 1-year interval.
    const s = computeStatus({ ...chain, installedAt: "2025-09-19" }, null, 6100, now);
    expect(s.level).toBe("overdue");
    expect(s.hint).toBe("Overdue by 4 wk");
  });

  it("counts from the latest reset event instead of installation", () => {
    const s = computeStatus(chain, { date: "2026-10-01", odometerKm: 9000 }, 9300, now);
    expect(s.level).toBe("ok");
    expect(s.since).toEqual({ date: "2026-10-01", km: 9000 });
    expect(s.hint).toBe("Due in 2,700 km");
  });

  it("ignores reset events from before the part was installed", () => {
    const s = computeStatus(chain, { date: "2026-01-01", odometerKm: 1000 }, 7000, now);
    expect(s.since).toEqual({ date: "2026-06-19", km: 6000 });
  });

  it("supports time-only intervals", () => {
    const s = computeStatus(
      { installedAt: "2026-07-01", installedKm: 0, intervalKm: null, intervalDays: 120 },
      null,
      5000,
      now,
    );
    expect(s.level).toBe("due"); // 110 of 120 days
    expect(s.hint).toBe("Due in 10 days");
  });

  it("reports no interval when none is set", () => {
    const s = computeStatus({ ...chain, intervalKm: null, intervalDays: null }, null, 9999, now);
    expect(s).toMatchObject({ level: "none", ratio: null });
  });
});
