import Link from "next/link";
import type { Part } from "@/db/schema";
import type { T } from "@/i18n";
import { getT, getUnits } from "@/i18n/server";
import { formatAge, formatDays, kmSince, partLifetime } from "@/lib/age";
import type { Units } from "@/lib/units";
import type { IntervalStatus, PartStatus } from "@/lib/status";
import { StatusBar, statusTextClass } from "../StatusBadge";

type Props = { part: Part; status: PartStatus; odometerKm: number };

function intervalText(t: T, u: Units, km: number | null, days: number | null) {
  if (km && days) return t("part.overview.either", { a: u.distance(km), b: formatDays(days, t) });
  return km ? u.distance(km) : days ? formatDays(days, t) : null;
}

/** One interval: how much is left, a bar, and the interval itself. */
function IntervalRow({
  t,
  u,
  title,
  every,
  track,
  showSince,
}: {
  t: T;
  u: Units;
  title: string;
  every: string | null;
  track: IntervalStatus | null;
  showSince: boolean;
}) {
  if (!track || !every) {
    return (
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{t("part.overview.noInterval")}</p>
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
            {t("part.overview.since", { date: u.date(track.since.date, "d MMM yyyy") })}
          </p>
        )}
      </div>
      <StatusBar
        level={track.level}
        ratio={track.ratio}
        label={t("part.overview.intervalUsed", { interval: title })}
      />
      <p className="text-muted-foreground text-xs">{every}</p>
    </div>
  );
}

export async function PartOverview({ part, status, odometerKm }: Props) {
  const [t, u] = await Promise.all([getT(), getUnits()]);
  const serviced =
    status.service !== null &&
    (status.service.since.date !== part.installedAt ||
      status.service.since.km !== part.installedKm);
  const service = intervalText(t, u, part.serviceIntervalKm, part.serviceIntervalDays);
  const replace = intervalText(t, u, part.replaceIntervalKm, part.replaceIntervalDays);

  const stats = [
    { label: t("part.overview.age"), value: formatAge(part.installedAt, new Date(), t) },
    {
      label: t("part.overview.ridden"),
      value: u.distance(kmSince(part.installedKm, odometerKm)),
    },
    { label: t("part.overview.installed"), value: u.date(part.installedAt, "d MMM yyyy") },
  ];

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <p className={`font-semibold ${statusTextClass(status.level)}`}>{status.condition}</p>
      <div className="flex flex-col gap-4">
        <IntervalRow
          t={t}
          u={u}
          title={t("part.overview.service")}
          every={service && t("part.overview.every", { interval: service })}
          track={status.service}
          showSince={serviced}
        />
        <IntervalRow
          t={t}
          u={u}
          title={t("part.overview.replacement")}
          every={replace && t("part.overview.after", { interval: replace })}
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
        <p className="text-muted-foreground text-sm">
          {t("part.overview.price", { price: u.money(part.cost) })}
        </p>
      )}
    </section>
  );
}

export async function RetiredPartOverview({ part, bikeId }: { part: Part; bikeId: number }) {
  const [t, u] = await Promise.all([getT(), getUnits()]);
  const lifetime = partLifetime(part);
  const stats = [
    { label: t("part.overview.inUseFor"), value: formatDays(lifetime.days, t) },
    { label: t("part.overview.lifetime"), value: u.distance(lifetime.km) },
    { label: t("part.overview.installed"), value: u.date(part.installedAt, "d MMM yyyy") },
    { label: t("part.overview.replaced"), value: u.date(part.retiredAt!, "d MMM yyyy") },
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
        {part.cost != null ? (
          <p>{t("part.overview.price", { price: u.money(part.cost) })}</p>
        ) : (
          <span />
        )}
        {part.replacedByPartId && (
          <Link
            href={`/bikes/${bikeId}/parts/${part.replacedByPartId}`}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t("part.overview.seeReplacement")}
          </Link>
        )}
      </div>
    </section>
  );
}
