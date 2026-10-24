import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { BikeNav } from "@/components/BikeNav";
import { CostsByCategoryChart, CostsByYearChart } from "@/components/costs/CostCharts";
import { getBike, getCostEntries } from "@/db/queries";
import type { T } from "@/i18n";
import { getT, getUnits } from "@/i18n/server";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { costPerYear, summarizeCosts, type CostEntry } from "@/lib/costs";
import { toUnit, type Units } from "@/lib/units";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ bikeId: string }>;

export default async function CostsPage({ params }: { params: Params }) {
  const user = await requireUser();
  const bike = await getBike(user.id, Number((await params).bikeId));
  if (!bike) notFound();
  const [t, u] = await Promise.all([getT(), getUnits()]);

  const entries = getCostEntries(bike, t);
  const thisYear = new Date().getFullYear();
  const summary = summarizeCosts(entries, thisYear);
  const maintenanceThisYear = summary.byYear.find((y) => y.year === thisYear)?.amount ?? 0;
  // Owned since the purchase date, or since the bike was added when there's none.
  const ownedSince = bike.purchasedAt ?? format(bike.createdAt, "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
        <BikeNav bikeId={bike.id} />
      </header>

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          {t("costs.page.empty")}
        </p>
      ) : (
        <>
          <section
            aria-label={t("costs.page.totals")}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <div className="bg-card col-span-full flex flex-col gap-1 rounded-xl border px-4 py-3">
              <p className="text-muted-foreground text-sm">
                {t("costs.page.totalOf", { bike: bike.name })}
              </p>
              <p className="text-5xl font-semibold tracking-tight">{u.money(summary.total)}</p>
              <p className="text-muted-foreground text-sm">
                {summary.purchase > 0
                  ? t("costs.page.split", {
                      bike: u.money(summary.purchase),
                      maintenance: u.money(summary.maintenance),
                    })
                  : t("costs.page.noPurchase")}
              </p>
            </div>
            {/* Full width on phones, so the two maintenance tiles below pair up. */}
            <Stat
              label={t("costs.page.perYear")}
              value={u.money(costPerYear(summary.total, ownedSince))}
              className="max-sm:col-span-2"
            />
            <Stat
              label={t("costs.page.maintenanceIn", { year: thisYear })}
              value={u.money(maintenanceThisYear)}
            />
            {bike.odometerKm >= 100 && (
              <Stat
                label={t("costs.page.perThousand", { n: u.number(1000), unit: u.unitLabel })}
                value={u.money((summary.maintenance / toUnit(bike.odometerKm, u.unit)) * 1000)}
              />
            )}
          </section>

          {summary.maintenance > 0 ? (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section
                aria-labelledby="per-year-heading"
                className="bg-card flex flex-col gap-4 rounded-xl border p-4"
              >
                <h2 id="per-year-heading" className="font-semibold">
                  {t("costs.page.perYearChart")}
                </h2>
                <CostsByYearChart data={summary.byYear} />
              </section>
              <section
                aria-labelledby="per-category-heading"
                className="bg-card flex flex-col gap-4 rounded-xl border p-4"
              >
                <h2 id="per-category-heading" className="font-semibold">
                  {t("costs.page.perCategoryChart")}
                </h2>
                <CostsByCategoryChart data={summary.byCategory} total={summary.maintenance} />
              </section>
            </div>
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
              {t("costs.page.noMaintenance")}
            </p>
          )}

          <section aria-labelledby="all-costs-heading" className="flex flex-col gap-3">
            <h2 id="all-costs-heading" className="text-lg font-semibold">
              {t("costs.page.everyCost")}
            </h2>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
              {entries.map((entry, i) => (
                <CostRow key={i} entry={entry} bikeId={bike.id} t={t} u={u} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("bg-card flex flex-col gap-1 rounded-xl border px-4 py-3", className)}>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CostRow({ entry, bikeId, t, u }: { entry: CostEntry; bikeId: number; t: T; u: Units }) {
  // The purchase price is edited in Settings; service rounds are listed under History.
  const href =
    entry.source === "purchase"
      ? "/settings"
      : entry.partId
        ? `/bikes/${bikeId}/parts/${entry.partId}`
        : `/bikes/${bikeId}/history`;

  return (
    <li>
      <Link
        href={href}
        className="hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.label}</p>
          <p className="text-muted-foreground text-sm">
            {u.date(entry.date, "d MMM yyyy")} · {t(`costs.categories.${entry.category}`)}
            {entry.source === "part" && (
              <span className="max-sm:hidden"> · {t("costs.page.partPrice")}</span>
            )}
          </p>
        </div>
        <p className="shrink-0 font-medium tabular-nums">{u.money(entry.amount)}</p>
        <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const user = await getCurrentUser();
  const bike = user && (await getBike(user.id, Number((await params).bikeId)));
  const t = await getT();
  return {
    title: bike
      ? t("meta.title", { page: `${t("bike.tabs.costs")} · ${bike.name}` })
      : t("common.appName"),
  };
}
