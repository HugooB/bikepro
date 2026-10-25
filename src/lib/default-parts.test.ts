import { describe, expect, it } from "vitest";
import { bikeTypes, brakeTypes, tireTypes } from "@/db/schema";
import { hasKey } from "@/i18n";
import { defaultPartsFor } from "./default-parts";
import { isBikeZone } from "./zones";

const kinds = (type: (typeof bikeTypes)[number]) => defaultPartsFor(type).map((p) => p.kind);

describe("defaultPartsFor", () => {
  it("gives every template part a translation, a drawing zone and one name per kind", () => {
    const names = new Map<string, string>();
    for (const type of bikeTypes)
      for (const brakes of brakeTypes)
        for (const tires of tireTypes)
          for (const part of defaultPartsFor(type, brakes, tires)) {
            expect(hasKey(`partKinds.${part.kind}`), part.kind).toBe(true);
            expect(isBikeZone(part.svgZone), part.kind).toBe(true);
            expect(names.get(part.kind) ?? part.name, part.kind).toBe(part.name);
            names.set(part.kind, part.name);
          }
  });

  it("tracks suspension and grips on a mountain bike, without a front derailleur or bar tape", () => {
    expect(kinds("mtb")).toEqual(
      expect.arrayContaining(["fork", "rear_shock", "dropper_post", "grips", "chain"]),
    );
    expect(kinds("mtb")).not.toContain("derailleur_front");
    expect(kinds("mtb")).not.toContain("bar_tape");
    expect(defaultPartsFor("mtb").find((p) => p.kind === "chain")?.replaceIntervalKm).toBeLessThan(
      defaultPartsFor("road").find((p) => p.kind === "chain")!.replaceIntervalKm!,
    );
  });

  it("tracks a hub gear and a single sprocket on a city bike, without derailleurs", () => {
    expect(kinds("city")).toEqual(expect.arrayContaining(["hub_gear", "sprocket", "grips"]));
    for (const kind of ["derailleur_front", "derailleur_rear", "cassette", "cleats", "bar_tape"])
      expect(kinds("city")).not.toContain(kind);
  });
});
