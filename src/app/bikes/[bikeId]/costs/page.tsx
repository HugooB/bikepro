import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { BikeNav } from "@/components/BikeNav";
import { CostsByCategoryChart, CostsByYearChart } from "@/components/costs/CostCharts";
import { getBike, getCostEntries } from "@/db/queries";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { costCategoryLabels, summarizeCosts, type CostEntry } from "@/lib/costs";
import { formatCost } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ bikeId: string }>;

export default async function CostsPage({ params }: { params: Params }) {
  const user = await requireUser();
  const bike = await getBike(user.id, Number((await params).bikeId));
  if (!bike) notFound();

  const entries = getCostEntries(bike);
  const thisYear = new Date().getFullYear();
  const summary = summarizeCosts(entries, thisYear);
  const maintenanceThisYear = summary.byYear.find((y) => y.year === thisYear)?.amount ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
        <BikeNav bikeId={bike.id} />
      </header>

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          No costs yet. Add what you paid for the bike in Settings, a price when you add or replace
          a part, or a cost when you log maintenance or a service round, and it adds up here.
        </p>
      ) : (
        <>
          <section aria-label="Totals" className="grid grid-cols-2 gap-3">
            <div className="bg-card col-span-2 flex flex-col gap-1 rounded-xl border px-4 py-3">
              <p className="text-muted-foreground text-sm">Total cost of {bike.name}</p>
              <p className="text-5xl font-semibold tracking-tight">{formatCost(summary.total)}</p>
              <p className="text-muted-foreground text-sm">
                {summary.purchase > 0
                  ? `${formatCost(summary.purchase)} to buy it + ${formatCost(summary.maintenance)} on parts and maintenance`
                  : "Parts and maintenance. Add what you paid for the bike in Settings to include it."}
              </p>
            </div>
            <Stat label={`Maintenance in ${thisYear}`} value={formatCost(maintenanceThisYear)} />
            {bike.odometerKm >= 100 && (
              <Stat
                label="Maintenance per 1,000 km"
                value={formatCost((summary.maintenance / bike.odometerKm) * 1000)}
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
                  Maintenance per year
                </h2>
                <CostsByYearChart data={summary.byYear} />
              </section>
              <section
                aria-labelledby="per-category-heading"
                className="bg-card flex flex-col gap-4 rounded-xl border p-4"
              >
                <h2 id="per-category-heading" className="font-semibold">
                  Maintenance per category
                </h2>
                <CostsByCategoryChart data={summary.byCategory} total={summary.maintenance} />
              </section>
            </div>
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
              No maintenance costs yet. Part prices and the costs of maintenance and service rounds
              show up here per year and per category.
            </p>
          )}

          <section aria-labelledby="all-costs-heading" className="flex flex-col gap-3">
            <h2 id="all-costs-heading" className="text-lg font-semibold">
              Every cost
            </h2>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
              {entries.map((entry, i) => (
                <CostRow key={i} entry={entry} bikeId={bike.id} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CostRow({ entry, bikeId }: { entry: CostEntry; bikeId: number }) {
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
            {format(parseISO(entry.date), "d MMM yyyy")} · {costCategoryLabels[entry.category]}
            {entry.source === "part" && <span className="max-sm:hidden"> · part price</span>}
          </p>
        </div>
        <p className="shrink-0 font-medium tabular-nums">{formatCost(entry.amount)}</p>
        <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const user = await getCurrentUser();
  const bike = user && (await getBike(user.id, Number((await params).bikeId)));
  return { title: bike ? `Costs · ${bike.name} · BikePro` : "BikePro" };
}
