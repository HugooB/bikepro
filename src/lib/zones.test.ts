import { describe, expect, it } from "vitest";
import { summarizeZones, type ZonePart } from "./zones";

const part = (id: number, zone: string | null, level: ZonePart["level"]): ZonePart => ({
  id,
  name: `Part ${id}`,
  zone,
  level,
  hint: "",
});

describe("summarizeZones", () => {
  it("groups parts per zone and takes the most urgent status", () => {
    const zones = summarizeZones([
      part(1, "pedals", "ok"),
      part(2, "pedals", "overdue"),
      part(3, "tire_rear", "due"),
      part(4, "tire_rear", "none"),
    ]);
    expect(zones.get("pedals")).toMatchObject({ level: "overdue", parts: [{ id: 1 }, { id: 2 }] });
    expect(zones.get("tire_rear")?.level).toBe("due");
  });

  it("ignores parts without a known zone, like custom parts", () => {
    const zones = summarizeZones([part(1, null, "overdue"), part(2, "power_meter", "due")]);
    expect(zones.size).toBe(0);
  });

  it("leaves out zones with no parts", () => {
    expect(summarizeZones([part(1, "chain", "ok")]).has("brake_front")).toBe(false);
  });
});
