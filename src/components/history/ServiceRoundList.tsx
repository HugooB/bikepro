import { format, parseISO } from "date-fns";
import { Store } from "lucide-react";
import type { ServiceRoundWithParts } from "@/db/queries";
import { eventTypeLabels } from "@/lib/event-types";
import { getUnits } from "@/lib/auth/session";
import { DeleteServiceRoundButton } from "./DeleteServiceRoundButton";

export async function ServiceRoundList({ rounds }: { rounds: ServiceRoundWithParts[] }) {
  const u = await getUnits();
  if (rounds.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No service rounds yet. Use the <span className="font-medium">Service round</span> button on
        the Parts tab after a shop visit.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rounds.map((round) => {
        const events = [...round.events].sort((a, b) => a.part.sortOrder - b.part.sortOrder);
        const hasReplacements = events.some((e) => e.type === "replaced");
        return (
          <li key={round.id} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="bg-brand/10 text-brand grid size-9 shrink-0 place-items-center rounded-full">
                  <Store className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{round.shop ?? "Service round"}</p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {[
                      format(parseISO(round.date), "d MMM yyyy"),
                      u.distance(round.odometerKm),
                      round.totalCost != null ? u.money(round.totalCost) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <DeleteServiceRoundButton roundId={round.id} hasReplacements={hasReplacements} />
            </div>
            {round.notes && <p className="text-sm">{round.notes}</p>}
            {events.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="bg-background rounded-full border px-2.5 py-1 text-xs"
                    title={e.description ?? undefined}
                  >
                    {e.part.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {eventTypeLabels[e.type].toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
