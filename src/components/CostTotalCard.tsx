import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import type { CostSummary } from "@/lib/costs";
import { formatCost } from "@/lib/format";

/** The bike's total cost under its odometer, linking to the Costs tab. */
export function CostTotalCard({ bikeId, summary }: { bikeId: number; summary: CostSummary }) {
  const split =
    summary.purchase > 0
      ? `${formatCost(summary.purchase)} bike + ${formatCost(summary.maintenance)} maintenance`
      : summary.maintenance > 0
        ? "Parts and maintenance"
        : "Nothing recorded yet";

  return (
    <Link
      href={`/bikes/${bikeId}/costs`}
      className="bg-card hover:bg-muted/60 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors outline-none focus-visible:ring-3"
    >
      <Wallet className="text-muted-foreground size-5" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">Total cost</p>
        <p className="text-lg font-semibold tabular-nums">{formatCost(summary.total)}</p>
        <p className="text-muted-foreground truncate text-xs">{split}</p>
      </div>
      <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
