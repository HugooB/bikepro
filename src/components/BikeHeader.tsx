import { format, parseISO } from "date-fns";
import type { Bike, ServiceRound } from "@/db/schema";
import { formatAge } from "@/lib/age";

export function BikeHeader({ bike, lastRound }: { bike: Bike; lastRound?: ServiceRound }) {
  const makeModel = [bike.brand, bike.model].filter(Boolean).join(" ");
  const owned = bike.purchasedAt
    ? `yours since ${format(parseISO(bike.purchasedAt), "MMMM yyyy")} (${formatAge(bike.purchasedAt)})`
    : null;

  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
      {(makeModel || owned) && (
        <p className="text-muted-foreground">
          {makeModel}
          {makeModel && owned ? ", " : ""}
          {owned}
        </p>
      )}
      {lastRound && (
        <p className="text-muted-foreground text-sm">
          Last service round on {format(parseISO(lastRound.date), "d MMM yyyy")}
          {lastRound.shop && ` at ${lastRound.shop}`}
        </p>
      )}
    </header>
  );
}
