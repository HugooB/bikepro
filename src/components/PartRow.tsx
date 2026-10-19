import type { Part } from "@/db/schema";
import { formatAge, formatKm, kmSince } from "@/lib/age";

export function PartRow({ part, odometerKm }: { part: Part; odometerKm: number }) {
  const detail = [part.brand, part.model].filter(Boolean).join(" ");

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{part.name}</p>
        {detail && <p className="text-muted-foreground truncate text-sm">{detail}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-medium tabular-nums">{formatAge(part.installedAt)}</p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {formatKm(kmSince(part.installedKm, odometerKm))}
        </p>
      </div>
    </li>
  );
}
