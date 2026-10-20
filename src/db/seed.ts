// Dev-only: creates a sample "Race bike" with all default parts. Usage: npm run db:seed [-- --reset]
// Real bikes are added with the add-bike wizard at /bikes/new.
import { format, subMonths } from "date-fns";
import { defaultPartsFor } from "../lib/default-parts";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { bikes, partEvents, parts } from "./schema";

if (process.env.NODE_ENV === "production") {
  console.error("The seed script is for development only; add bikes with the wizard instead.");
  process.exit(1);
}

runMigrations();

const reset = process.argv.includes("--reset");
if (reset) {
  db.delete(bikes).run(); // parts and events cascade
} else if (db.select().from(bikes).all().length > 0) {
  console.log("Database already has bikes; nothing to seed. Use --reset to start over.");
  process.exit(0);
}

const now = new Date();
const day = (d: Date) => format(d, "yyyy-MM-dd");
const purchasedAt = day(subMonths(now, 18));

// A few parts were replaced since purchase, so the list shows a realistic mix of ages.
const replaced: Record<string, { monthsAgo: number; km: number }> = {
  chain: { monthsAgo: 4, km: 6200 },
  tire_rear: { monthsAgo: 7, km: 4800 },
  brake_pads_rear: { monthsAgo: 2, km: 7400 },
  sealant: { monthsAgo: 1, km: 7900 },
  bar_tape: { monthsAgo: 11, km: 3100 },
};

db.transaction((tx) => {
  const bike = tx
    .insert(bikes)
    .values({
      name: "Race bike",
      type: "road",
      brand: "Canyon",
      model: "Ultimate CF SL",
      purchasedAt,
      odometerKm: 8412,
    })
    .returning()
    .get();

  defaultPartsFor("road").forEach((template, i) => {
    const swap = replaced[template.kind];
    const installedAt = swap ? day(subMonths(now, swap.monthsAgo)) : purchasedAt;
    const installedKm = swap?.km ?? 0;

    const part = tx
      .insert(parts)
      .values({ ...template, bikeId: bike.id, installedAt, installedKm, sortOrder: i })
      .returning()
      .get();

    tx.insert(partEvents)
      .values({
        partId: part.id,
        date: installedAt,
        odometerKm: installedKm,
        type: "installed",
        resetsInterval: true,
        description: swap ? `New ${template.name.toLowerCase()} fitted` : "Came with the bike",
      })
      .run();
  });

  console.log(
    `Seeded "${bike.name}" (id ${bike.id}) with ${defaultPartsFor("road").length} parts.`,
  );
});
