import type { PartStatus } from "@/lib/status";
import { StatusDot } from "./StatusBadge";

/** One-line overview of how many parts need attention. */
export function StatusSummary({ statuses }: { statuses: PartStatus[] }) {
  const overdue = statuses.filter((s) => s.level === "overdue").length;
  const due = statuses.filter((s) => s.level === "due").length;

  if (overdue === 0 && due === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <StatusDot level="ok" /> All parts are in good shape.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {overdue > 0 && (
        <span className="flex items-center gap-2">
          <StatusDot level="overdue" /> {overdue} overdue
        </span>
      )}
      {due > 0 && (
        <span className="flex items-center gap-2">
          <StatusDot level="due" /> {due} due soon
        </span>
      )}
    </p>
  );
}
