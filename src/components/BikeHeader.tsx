import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Bike, ServiceRound } from "@/db/schema";
import { formatAge } from "@/lib/age";
import { brakeTypeLabels } from "@/lib/default-parts";

export function BikeHeader({ bike, lastRound }: { bike: Bike; lastRound?: ServiceRound }) {
  const makeModel = [bike.brand, bike.model].filter(Boolean).join(" ");
  const brakes = brakeTypeLabels[bike.brakeType].toLowerCase();
  const owned = bike.purchasedAt
    ? `yours since ${format(parseISO(bike.purchasedAt), "MMMM yyyy")} (${formatAge(bike.purchasedAt)})`
    : null;

  return (
    <header className="flex flex-col gap-1.5">
      {bike.archivedAt && (
        <p className="bg-muted text-muted-foreground mb-1 self-start rounded-full px-3 py-1 text-xs font-medium">
          Archived ·{" "}
          <Link href="/settings" className="text-foreground underline underline-offset-2">
            restore in Settings
          </Link>
        </p>
      )}
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
      <p className="text-muted-foreground">
        {[makeModel ? `${makeModel} with ${brakes}` : brakeTypeLabels[bike.brakeType], owned]
          .filter(Boolean)
          .join(", ")}
      </p>
      {lastRound && (
        <p className="text-muted-foreground text-sm">
          Last service round on {format(parseISO(lastRound.date), "d MMM yyyy")}
          {lastRound.shop && ` at ${lastRound.shop}`}
        </p>
      )}
    </header>
  );
}
