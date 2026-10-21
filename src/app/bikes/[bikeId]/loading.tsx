import { Skeleton } from "@/components/states/Skeleton";

/** Same two columns as the bike page: drawing and odometer left, parts list right. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid gap-8 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:gap-12"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="aspect-[765/455] w-full rounded-3xl" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="mb-2 h-9 w-56" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
