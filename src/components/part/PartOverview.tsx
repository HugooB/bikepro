import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Part } from "@/db/schema";
import { formatAge, formatDays, kmSince, partLifetime } from "@/lib/age";
import { getUnits } from "@/lib/auth/session";
import type { Units } from "@/lib/units";
import type { IntervalStatus, PartStatus } from "@/lib/status";
import { StatusBar, statusTextClass } from "../StatusBadge";

type Props = { part: Part; status: PartStatus; odometerKm: number };

function intervalText(u: Units, km: number | null, days: number | null) {
  const bits = [km ? u.distance(km) : null, days ? formatDays(days) : null].filter(Boolean);
  return bits.length ? bits.join(" or ") : null;
}

/** One interval: how much is left, a bar, and the interval itself. */
function IntervalRow({
  title,
  every,
  track,
  showSince,
}: {
  title: string;
  every: string | null;
  track: IntervalStatus | null;
  showSince: boolean;
}) {
  if (!track || !every) {
    return (
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">No interval</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p>
          <span className="font-medium">{title}</span>{" "}
          <span className={statusTextClass(track.level)}>{track.hint}</span>
        </p>
        {showSince && (
          <p className="text-muted-foreground text-xs">
            since {format(parseISO(track.since.date), "d MMM yyyy")}
          </p>
        )}
      </div>
      <StatusBar level={track.level} ratio={track.ratio} label={`${title} interval used`} />
      <p className="text-muted-foreground text-xs">{every}</p>
    </div>
  );
}

export async function PartOverview({ part, status, odometerKm }: Props) {
  const u = await getUnits();
  const serviced =
    status.service !== null &&
    (status.service.since.date !== part.installedAt ||
      status.service.since.km !== part.installedKm);
  const service = intervalText(u, part.serviceIntervalKm, part.serviceIntervalDays);
  const replace = intervalText(u, part.replaceIntervalKm, part.replaceIntervalDays);

  const stats = [
    { label: "Age", value: formatAge(part.installedAt) },
    { label: "Ridden", value: u.distance(kmSince(part.installedKm, odometerKm)) },
    { label: "Installed", value: format(parseISO(part.installedAt), "d MMM yyyy") },
  ];

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <p className={`font-semibold ${statusTextClass(status.level)}`}>{status.condition}</p>
      <div className="flex flex-col gap-4">
        <IntervalRow
          title="Service"
          every={service && `Every ${service}`}
          track={status.service}
          showSince={serviced}
        />
        <IntervalRow
          title="Replacement"
          every={replace && `After ${replace}`}
          track={status.replace}
          showSince={false}
        />
      </div>
      <dl className="grid grid-cols-3 gap-4 border-t pt-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-muted-foreground text-xs">{s.label}</dt>
            <dd className="font-medium tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {part.cost != null && (
        <p className="text-muted-foreground text-sm">Price: {u.money(part.cost)}</p>
      )}
    </section>
  );
}

export async function RetiredPartOverview({ part, bikeId }: { part: Part; bikeId: number }) {
  const u = await getUnits();
  const lifetime = partLifetime(part);
  const stats = [
    { label: "In use for", value: formatDays(lifetime.days) },
    { label: "Lifetime", value: u.distance(lifetime.km) },
    { label: "Installed", value: format(parseISO(part.installedAt), "d MMM yyyy") },
    { label: "Replaced", value: format(parseISO(part.retiredAt!), "d MMM yyyy") },
  ];

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-muted-foreground text-xs">{s.label}</dt>
            <dd className="font-medium tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        {part.cost != null ? <p>Price: {u.money(part.cost)}</p> : <span />}
        {part.replacedByPartId && (
          <Link
            href={`/bikes/${bikeId}/parts/${part.replacedByPartId}`}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            See the replacement →
          </Link>
        )}
      </div>
    </section>
  );
}
