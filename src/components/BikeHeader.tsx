import { format, parseISO } from "date-fns";
import type { Bike } from "@/db/schema";
import { formatAge } from "@/lib/age";
import { OdometerForm } from "./OdometerForm";

export function BikeHeader({ bike }: { bike: Bike }) {
  const subtitle = [bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        {subtitle && <p className="text-brand text-sm font-medium">{subtitle}</p>}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{bike.name}</h1>
        {bike.purchasedAt && (
          <p className="text-muted-foreground text-sm">
            Since {format(parseISO(bike.purchasedAt), "MMMM yyyy")} · {formatAge(bike.purchasedAt)}
          </p>
        )}
      </div>
      <OdometerForm bikeId={bike.id} odometerKm={bike.odometerKm} />
    </section>
  );
}
