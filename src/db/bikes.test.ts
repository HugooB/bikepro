import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { emptyDraft, partChoicesFor, planBike } from "@/lib/wizard-schema";
import { createBike } from "./bikes";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { partEvents, parts } from "./schema";

beforeAll(() => runMigrations());

describe("createBike", () => {
  it("creates the bike, its chosen parts and an installed event for each", () => {
    const choices = partChoicesFor("gravel").map((p) => {
      if (p.kind === "rotors") return { ...p, included: false };
      if (p.kind === "chain")
        return { ...p, replaced: true, replacedAt: "2026-09-20", replacedKm: "2400" };
      return p;
    });
    const plan = planBike(
      {
        ...emptyDraft("2026-10-20"),
        name: "Gravel",
        type: "gravel",
        purchasedAt: "2025-10-20",
        odometerKm: "2600",
        parts: choices,
      },
      "2026-10-20",
    );

    const bike = db.transaction((tx) => createBike(tx, plan));

    const rows = db.select().from(parts).where(eq(parts.bikeId, bike.id)).all();
    expect(bike).toMatchObject({ name: "Gravel", type: "gravel", odometerKm: 2600 });
    expect(rows).toHaveLength(plan.parts.length);
    expect(rows.some((p) => p.kind === "rotors")).toBe(false);

    const chain = rows.find((p) => p.kind === "chain")!;
    expect(chain).toMatchObject({ installedAt: "2026-09-20", installedKm: 2400, status: "active" });
    expect(db.select().from(partEvents).where(eq(partEvents.partId, chain.id)).all()).toMatchObject(
      [
        {
          type: "installed",
          date: "2026-09-20",
          odometerKm: 2400,
          resetsInterval: true,
          description: "New chain fitted after buying the bike",
        },
      ],
    );
  });
});
