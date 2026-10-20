"use client";

import { useState } from "react";
import { costCategoryLabels, type CostSummary } from "@/lib/costs";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";

// Two single-series bar charts in the brand blue. Every value is also in a visually hidden
// table (and in the cost list below the charts), so the tooltips never gate anything.

const compact = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatCompact = (amount: number) =>
  amount < 1000 ? formatCost(Math.round(amount)).replace(/\.00$/, "") : compact.format(amount);

/** Value-first tooltip, shown for the hovered or focused mark. */
function Tooltip({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="presentation"
      className={cn(
        "bg-popover text-popover-foreground pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md",
        className,
      )}
    >
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

/** Columns per year, from the first cost to this year. */
export function CostsByYearChart({ data }: { data: CostSummary["byYear"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.amount), 1);
  // Cap labels only while they fit; past that the tooltip and the table carry the values.
  const showCaps = data.length <= 8;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-48 items-end gap-0.5" onPointerLeave={() => setActive(null)}>
        {data.map((d, i) => (
          <div
            key={d.year}
            tabIndex={0}
            aria-label={`${d.year}: ${formatCost(d.amount)}`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group focus-visible:ring-ring/50 relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-md outline-none focus-visible:ring-3"
          >
            {active === i && (
              <Tooltip
                value={formatCost(d.amount)}
                label={`Spent in ${d.year}`}
                className="bottom-full mb-1"
              />
            )}
            {showCaps && d.amount > 0 && (
              <span className="text-muted-foreground mb-1 text-xs tabular-nums">
                {formatCompact(d.amount)}
              </span>
            )}
            <div
              className={cn(
                "bg-brand w-full max-w-6 rounded-t-[4px] transition-opacity",
                active !== null && active !== i && "opacity-60",
              )}
              // Leave room above the tallest column for its cap label.
              style={{ height: `calc(${d.amount / max} * (100% - ${showCaps ? 20 : 0}px))` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-0.5 border-t pt-1.5">
        {data.map((d, i) => (
          <span
            key={d.year}
            className={cn(
              "text-muted-foreground min-w-0 flex-1 text-center text-xs tabular-nums",
              // Many years on a phone: label every other one.
              !showCaps && i % 2 === 1 && "max-sm:invisible",
            )}
          >
            {data.length > 6 ? `'${String(d.year).slice(2)}` : d.year}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Costs per year</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.year}>
              <th scope="row">{d.year}</th>
              <td>{formatCost(d.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars per category, most expensive first, with the share in the tooltip. */
export function CostsByCategoryChart({
  data,
  total,
}: {
  data: CostSummary["byCategory"];
  total: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <figure>
      <ul className="flex flex-col gap-1" onPointerLeave={() => setActive(null)}>
        {data.map((d, i) => {
          const share = Math.round((d.amount / total) * 100);
          return (
            <li
              key={d.category}
              tabIndex={0}
              aria-label={`${costCategoryLabels[d.category]}: ${formatCost(d.amount)}, ${share}% of the total`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="focus-visible:ring-ring/50 relative grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 rounded-md py-1.5 outline-none focus-visible:ring-3 sm:grid-cols-[9rem_1fr_auto]"
            >
              <span className="truncate text-sm">{costCategoryLabels[d.category]}</span>
              <div className="relative h-4">
                <div
                  className={cn(
                    "bg-brand h-full rounded-r-[4px] transition-opacity",
                    active !== null && active !== i && "opacity-60",
                  )}
                  style={{ width: `${Math.max((d.amount / max) * 100, 1)}%` }}
                />
                {active === i && (
                  <Tooltip
                    value={`${share}%`}
                    label="of maintenance costs"
                    className="bottom-full left-0 mb-1"
                  />
                )}
              </div>
              <span className="text-sm font-medium tabular-nums">{formatCost(d.amount)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
