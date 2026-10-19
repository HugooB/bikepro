import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Part } from "@/db/schema";
import { formatAge, formatKm, kmSince } from "@/lib/age";
import type { PartStatus } from "@/lib/status";
import { StatusDot, statusTextClass } from "./StatusBadge";

type Props = { part: Part; status: PartStatus; odometerKm: number };

export function PartRow({ part, status, odometerKm }: Props) {
  return (
    <li>
      <Link
        href={`/bikes/${part.bikeId}/parts/${part.id}`}
        className="hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none"
      >
        <StatusDot level={status.level} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{part.name}</p>
          <p className={`truncate text-sm ${statusTextClass(status.level)}`}>{status.hint}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium tabular-nums">{formatAge(part.installedAt)}</p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {formatKm(kmSince(part.installedKm, odometerKm))}
          </p>
        </div>
        <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
