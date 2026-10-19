import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { Part } from "@/db/schema";
import { formatDays, formatKm, partLifetime } from "@/lib/age";
import { formatCost } from "@/lib/format";

export function RetiredPartsList({ parts }: { parts: Part[] }) {
  if (parts.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No parts replaced yet. When you replace a part, the old one shows up here.
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
                  {part.name}
                  {detail && <span className="text-muted-foreground font-normal"> · {detail}</span>}
                </p>
                <p className="text-muted-foreground text-sm">
                  {format(parseISO(part.installedAt), "MMM yyyy")} –{" "}
                  {format(parseISO(part.retiredAt!), "MMM yyyy")}
                  {part.cost != null && ` · ${formatCost(part.cost)}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium tabular-nums">{formatKm(lifetime.km)}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {formatDays(lifetime.days)}
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
