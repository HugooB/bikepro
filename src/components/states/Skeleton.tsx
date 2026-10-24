import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** A grey placeholder block while a page loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("bg-muted animate-pulse rounded-xl motion-reduce:animate-none", className)}
    />
  );
}

/** Generic page while loading: a title, a tab row and a list. */
export async function PageSkeleton({ rows = 5 }: { rows?: number }) {
  const t = await getT();
  return (
    <div role="status" aria-label={t("common.loading")} className="flex flex-col gap-6">
      <Skeleton className="h-10 w-2/3 max-w-sm" />
      <Skeleton className="h-8 w-56" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
