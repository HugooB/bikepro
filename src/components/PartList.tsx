import { partCategories, type Part } from "@/db/schema";
import { categoryLabels } from "@/lib/default-parts";
import { PartRow } from "./PartRow";

export function PartList({ parts, odometerKm }: { parts: Part[]; odometerKm: number }) {
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
                <PartRow key={part.id} part={part} odometerKm={odometerKm} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
