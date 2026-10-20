import type { PartCategory } from "@/db/schema";
import { categoryLabels } from "./default-parts";

// Money spent on a bike comes from four places, and each euro is recorded in exactly one:
// the bike's purchase price, a part's price (dated when it was installed), the cost of a
// maintenance step, and a service round's total. Events logged as part of a round carry no
// cost of their own, and a replacement's price is stored on the new part, so nothing is
// counted twice. Everything except the purchase is "maintenance": the cost of running it.

export type CostCategory = PartCategory | "service" | "bike";

export const costCategoryLabels: Record<CostCategory, string> = {
  ...categoryLabels,
  service: "Service rounds",
  bike: "Bike purchase",
};

export type CostEntry = {
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  category: CostCategory;
  /** What the money went on, e.g. "Chain" or "Service round at Bike Shop". */
  label: string;
  source: "purchase" | "part" | "event" | "round";
  /** The part it belongs to; service rounds have none. */
  partId: number | null;
};

export type CostSummary = {
  /** Purchase plus maintenance. */
  total: number;
  purchase: number;
  maintenance: number;
  /** Maintenance per year, from the first cost to `currentYear`, gaps included as 0. */
  byYear: { year: number; amount: number }[];
  /** Maintenance categories that have costs, most expensive first. */
  byCategory: { category: CostCategory; amount: number }[];
};

export function summarizeCosts(entries: CostEntry[], currentYear: number): CostSummary {
  const years = new Map<number, number>();
  const categories = new Map<CostCategory, number>();
  let purchase = 0;
  let maintenance = 0;
  for (const e of entries) {
    // The purchase would dwarf the yearly running costs, so the breakdowns leave it out.
    if (e.source === "purchase") {
      purchase += e.amount;
      continue;
    }
    maintenance += e.amount;
    const year = Number(e.date.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + e.amount);
    categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);
  }

  const byYear: CostSummary["byYear"] = [];
  if (years.size > 0) {
    const first = Math.min(...years.keys());
    const last = Math.max(currentYear, ...years.keys());
    for (let year = first; year <= last; year++) {
      byYear.push({ year, amount: years.get(year) ?? 0 });
    }
  }

  const byCategory = [...categories]
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { total: purchase + maintenance, purchase, maintenance, byYear, byCategory };
}
