import { describe, expect, it } from "vitest";
import { computeStatus, NO_INTERVALS } from "./status";

const now = new Date(2026, 9, 19, 12, 0); // 19 Oct 2026

// Clean every 400 km, replace after 4,000 km; installed 4 months ago at 6,000 km.
const chain = {
  installedAt: "2026-06-19",
  installedKm: 6000,
  serviceIntervalKm: 400,
  serviceIntervalDays: null,
  replaceIntervalKm: 4000,
  replaceIntervalDays: null,
};
const cleaned = (km: number) => ({ date: "2026-10-10", odometerKm: km });

describe("computeStatus", () => {
  it("is in good condition well within both intervals", () => {
    const s = computeStatus(chain, cleaned(7000), 7100, { now });
    expect(s).toMatchObject({ level: "ok", condition: "Good condition" });
    expect(s.service).toMatchObject({ level: "ok", hint: "in 300 km" });
    expect(s.replace).toMatchObject({ level: "ok", hint: "in 2,900 km" });
    expect(s.replace!.ratio).toBeCloseTo(1100 / 4000);
  });

  it("is fair past half an interval", () => {
    // 2,200 of 4,000 km used; cleaned 100 km ago.
    expect(computeStatus(chain, cleaned(8100), 8200, { now })).toMatchObject({
      level: "ok",
      condition: "Fair condition",
    });
  });

  it("counts the service from the last service, the replacement from installation", () => {
    const s = computeStatus(chain, cleaned(9000), 9100, { now });
    expect(s.service).toMatchObject({ hint: "in 300 km", since: { km: 9000 } });
    expect(s.replace).toMatchObject({ level: "due", since: { km: 6000 } });
    expect(s.condition).toBe("Replace soon");
  });

  it("asks for a service when only the service interval is due or overdue", () => {
    expect(computeStatus(chain, cleaned(7000), 7300, { now }).condition).toBe("Service soon");
    const s = computeStatus(chain, cleaned(7000), 7450, { now });
    expect(s).toMatchObject({ level: "overdue", condition: "Needs a service" });
    expect(s.service!.hint).toBe("overdue by 50 km");
  });

  it("needs replacing past the replacement interval, even right after a service", () => {
    const s = computeStatus(chain, cleaned(10100), 10200, { now });
    expect(s).toMatchObject({ level: "overdue", condition: "Needs replacing" });
    expect(s.replace!.hint).toBe("overdue by 200 km");
  });

  it("lets replacing win a tie with servicing", () => {
    // Both due soon: the chain is close to worn and close to its next clean.
    expect(computeStatus(chain, cleaned(8900), 9200, { now }).condition).toBe("Replace soon");
  });

  it("uses whichever of km and time runs out first", () => {
    const tire = {
      ...chain,
      installedAt: "2021-09-01",
      serviceIntervalKm: null,
      replaceIntervalKm: 7000,
      replaceIntervalDays: 5 * 365,
    };
    // Few km, but over five years old: the rubber has aged.
    const s = computeStatus(tire, null, 7000, { now });
    expect(s).toMatchObject({ level: "overdue", condition: "Needs replacing", service: null });
  });

  it("ignores a service logged before the part was installed", () => {
    const s = computeStatus(chain, { date: "2026-01-01", odometerKm: 1000 }, 6100, { now });
    expect(s.service!.since).toEqual({ date: "2026-06-19", km: 6000 });
  });

  it("has no condition without intervals", () => {
    const saddle = {
      ...chain,
      serviceIntervalKm: null,
      replaceIntervalKm: null,
    };
    expect(computeStatus(saddle, null, 9999, { now })).toMatchObject({
      level: "none",
      condition: NO_INTERVALS,
      service: null,
      replace: null,
    });
  });
});
