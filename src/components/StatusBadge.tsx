import { cn } from "@/lib/utils";
import { statusLabels, type StatusLevel } from "@/lib/status";

const dotColors: Record<StatusLevel, string> = {
  ok: "bg-status-ok",
  due: "bg-status-due",
  overdue: "bg-status-overdue",
  none: "bg-muted-foreground/40",
};

const textColors: Record<StatusLevel, string> = {
  ok: "text-status-ok",
  due: "text-[oklch(0.55_0.13_65)]", // darker amber for readable text on light backgrounds
  overdue: "text-status-overdue",
  none: "text-muted-foreground",
};

export function StatusDot({ level, className }: { level: StatusLevel; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 rounded-full", dotColors[level], className)}
    />
  );
}

export function statusTextClass(level: StatusLevel) {
  return textColors[level];
}

export function StatusBadge({ level }: { level: StatusLevel }) {
  return (
    <span
      className={cn(
        "bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        textColors[level],
      )}
    >
      <StatusDot level={level} className="size-2" />
      {statusLabels[level]}
    </span>
  );
}

/** Horizontal bar showing how much of the service interval is used up. */
export function StatusBar({ level, ratio }: { level: StatusLevel; ratio: number | null }) {
  if (ratio === null) return null;
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <div
      role="progressbar"
      aria-label="Service interval used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
    >
      <div
        className={cn("h-full rounded-full transition-[width]", dotColors[level])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
