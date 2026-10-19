import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { partCategories, type Part } from "@/db/schema";
import { categoryLabels } from "@/lib/default-parts";
import type { PartStatus } from "@/lib/status";
import { PartRow } from "./PartRow";

type Props = {
  bikeId: number;
  parts: Part[];
  statuses: Map<number, PartStatus>;
  odometerKm: number;
};

export function PartList({ bikeId, parts, statuses, odometerKm }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {partCategories.map((category) => {
        const items = parts.filter((p) => p.category === category);
        if (items.length === 0) return null;

        return (
          <section
            key={category}
            aria-labelledby={`cat-${category}`}
            className="flex flex-col gap-2"
          >
            <h2
              id={`cat-${category}`}
              className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase"
            >
              {categoryLabels[category]}
            </h2>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
              {items.map((part) => (
                <PartRow
                  key={part.id}
                  part={part}
                  status={statuses.get(part.id)!}
                  odometerKm={odometerKm}
                />
              ))}
            </ul>
          </section>
        );
      })}
      <Button asChild variant="outline" className="w-full border-dashed sm:w-fit">
        <Link href={`/bikes/${bikeId}/parts/new`}>
          <Plus aria-hidden />
          Add a part
        </Link>
      </Button>
    </div>
  );
}
