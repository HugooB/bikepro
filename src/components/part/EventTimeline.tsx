import { format, parseISO } from "date-fns";
import {
  NotebookPen,
  PackagePlus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { PartEventWithRound } from "@/db/queries";
import type { PartEventType } from "@/db/schema";
import { formatKm } from "@/lib/age";
import { eventTypeLabels } from "@/lib/event-types";
import { formatCost } from "@/lib/format";
import { DeleteEventButton } from "./DeleteEventButton";

const icons: Record<PartEventType, LucideIcon> = {
  installed: PackagePlus,
  serviced: Wrench,
  cleaned: Sparkles,
  adjusted: SlidersHorizontal,
  replaced: RefreshCw,
  note: NotebookPen,
};

type Props = { events: PartEventWithRound[]; readOnly?: boolean };

export function EventTimeline({ events, readOnly = false }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        Nothing logged yet.
      </p>
    );
  }

  return (
    <ol className="bg-card flex flex-col rounded-xl border">
      {events.map((event, i) => {
        const Icon = icons[event.type];
        const meta = [
          format(parseISO(event.date), "d MMM yyyy"),
          event.odometerKm != null ? formatKm(event.odometerKm) : null,
          event.cost != null ? formatCost(event.cost) : null,
        ].filter(Boolean);

        return (
          <li key={event.id} className="group relative flex gap-3 px-4 py-3">
            {/* Connector line between timeline entries */}
            {i < events.length - 1 && (
              <span
                aria-hidden
                className="bg-border absolute top-11 bottom-0 left-[1.95rem] w-px"
              />
            )}
            <span className="bg-background relative grid size-8 shrink-0 place-items-center rounded-full border">
              <Icon className="text-muted-foreground size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="font-medium">
                {eventTypeLabels[event.type]}
                {event.resetsInterval && event.type !== "installed" && (
                  <span className="text-muted-foreground ml-2 align-middle text-xs font-normal">
                    · interval restarted
                  </span>
                )}
              </p>
              {event.serviceRound && (
                <p className="text-brand text-sm">
                  Service round{event.serviceRound.shop && ` at ${event.serviceRound.shop}`}
                </p>
              )}
              {event.description && <p className="text-sm">{event.description}</p>}
              <p className="text-muted-foreground text-sm tabular-nums">{meta.join(" · ")}</p>
            </div>
            {!readOnly && event.type !== "installed" && !event.serviceRound && (
              <DeleteEventButton eventId={event.id} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
