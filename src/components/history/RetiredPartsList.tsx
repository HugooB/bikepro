import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Part } from "@/db/schema";
import { getT, getUnits } from "@/i18n/server";
import { formatDays, partLifetime } from "@/lib/age";
import { partName } from "@/lib/default-parts";

export async function RetiredPartsList({ parts }: { parts: Part[] }) {
  const [t, u] = await Promise.all([getT(), getUnits()]);
  if (parts.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        {t("history.noRetired")}
      </p>
    );
  }

  return (
    <ul className="bg-card divide-y overflow-hidden rounded-xl border">
      {parts.map((part) => {
        const lifetime = partLifetime(part);
        const detail = [part.brand, part.model].filter(Boolean).join(" ");
        return (
          <li key={part.id}>
            <Link
              href={`/bikes/${part.bikeId}/parts/${part.id}`}
              className="hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {partName(part, t)}
                  {detail && <span className="text-muted-foreground font-normal"> · {detail}</span>}
                </p>
                <p className="text-muted-foreground text-sm">
                  {u.date(part.installedAt, "MMM yyyy")} – {u.date(part.retiredAt!, "MMM yyyy")}
                  {part.cost != null && ` · ${u.money(part.cost)}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium tabular-nums">{u.distance(lifetime.km)}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {formatDays(lifetime.days, t)}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
