import Link from "next/link";
import type { Bike, ServiceRound } from "@/db/schema";
import { getT, getUnits } from "@/i18n/server";
import { formatAge } from "@/lib/age";

export async function BikeHeader({ bike, lastRound }: { bike: Bike; lastRound?: ServiceRound }) {
  const [t, u] = await Promise.all([getT(), getUnits()]);
  const makeModel = [bike.brand, bike.model].filter(Boolean).join(" ");
  const brakes = t(`brakeTypes.${bike.brakeType}`);
  const owned = bike.purchasedAt
    ? t("bike.ownedSince", {
        date: u.date(bike.purchasedAt, "MMMM yyyy"),
        age: formatAge(bike.purchasedAt, new Date(), t),
      })
    : null;

  return (
    <header className="flex flex-col gap-1.5">
      {bike.archivedAt && (
        <p className="bg-muted text-muted-foreground mb-1 self-start rounded-full px-3 py-1 text-xs font-medium">
          {t("bike.archived")} ·{" "}
          <Link href="/settings" className="text-foreground underline underline-offset-2">
            {t("bike.restoreInSettings")}
          </Link>
        </p>
      )}
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
      <p className="text-muted-foreground">
        {[
          makeModel
            ? t("bike.makeWithBrakes", { make: makeModel, brakes: brakes.toLowerCase() })
            : brakes,
          owned,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
      {lastRound && (
        <p className="text-muted-foreground text-sm">
          {lastRound.shop
            ? t("bike.lastRoundAt", {
                date: u.date(lastRound.date, "d MMM yyyy"),
                shop: lastRound.shop,
              })
            : t("bike.lastRound", { date: u.date(lastRound.date, "d MMM yyyy") })}
        </p>
      )}
    </header>
  );
}
