import { format, parseISO } from "date-fns";
import type { Part } from "@/db/schema";
import { formatAge, formatDays, formatKm, kmSince } from "@/lib/age";
import { formatCost } from "@/lib/format";
import type { PartStatus } from "@/lib/status";
import { StatusBar, statusTextClass } from "../StatusBadge";

type Props = { part: Part; status: PartStatus; odometerKm: number };

function intervalText(part: Part) {
  const bits = [
    part.intervalKm ? formatKm(part.intervalKm) : null,
    part.intervalDays ? formatDays(part.intervalDays) : null,
  ].filter(Boolean);
  return bits.length ? `Every ${bits.join(" or ")}` : "Not set";
}

export function PartOverview({ part, status, odometerKm }: Props) {
  const sinceReset = status.since.date !== part.installedAt || status.since.km !== part.installedKm;

  const stats = [
    { label: "Age", value: formatAge(part.installedAt) },
    { label: "Ridden", value: formatKm(kmSince(part.installedKm, odometerKm)) },
    { label: "Installed", value: format(parseISO(part.installedAt), "d MMM yyyy") },
    { label: "Service interval", value: intervalText(part) },
  ];

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      {status.ratio !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <p className={`font-medium ${statusTextClass(status.level)}`}>{status.hint}</p>
            {sinceReset && (
              <p className="text-muted-foreground text-xs">
                since {format(parseISO(status.since.date), "d MMM yyyy")}
              </p>
            )}
          </div>
          <StatusBar level={status.level} ratio={status.ratio} />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-muted-foreground text-xs">{s.label}</dt>
            <dd className="font-medium tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {part.cost != null && (
        <p className="text-muted-foreground text-sm">Price: {formatCost(part.cost)}</p>
      )}
    </section>
  );
}
