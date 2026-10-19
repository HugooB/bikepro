import { partCategories, type Part } from "@/db/schema";
import { categoryLabels } from "@/lib/default-parts";
import type { PartStatus } from "@/lib/status";
import { PartRow } from "./PartRow";

type Props = { parts: Part[]; statuses: Map<number, PartStatus>; odometerKm: number };

export function PartList({ parts, statuses, odometerKm }: Props) {
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
    </div>
  );
}
