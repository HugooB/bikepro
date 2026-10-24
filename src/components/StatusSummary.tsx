import { getT } from "@/i18n/server";
import type { PartStatus } from "@/lib/status";
import { StatusDot } from "./StatusBadge";

/** One-line overview of how many parts need attention. */
export async function StatusSummary({ statuses }: { statuses: PartStatus[] }) {
  const t = await getT();
  const overdue = statuses.filter((s) => s.level === "overdue").length;
  const due = statuses.filter((s) => s.level === "due").length;

  if (overdue === 0 && due === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <StatusDot level="ok" /> {t("bike.summary.allGood")}
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {overdue > 0 && (
        <span className="flex items-center gap-2">
          <StatusDot level="overdue" /> {t("bike.summary.overdue", { count: overdue })}
        </span>
      )}
      {due > 0 && (
        <span className="flex items-center gap-2">
          <StatusDot level="due" /> {t("bike.summary.due", { count: due })}
        </span>
      )}
    </p>
  );
}
