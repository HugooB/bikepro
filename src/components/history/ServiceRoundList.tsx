import { Store } from "lucide-react";
import type { ServiceRoundWithParts } from "@/db/queries";
import { rich } from "@/i18n/rich";
import { getT, getUnits } from "@/i18n/server";
import { partName } from "@/lib/default-parts";
import { DeleteServiceRoundButton } from "./DeleteServiceRoundButton";

export async function ServiceRoundList({ rounds }: { rounds: ServiceRoundWithParts[] }) {
  const [t, u] = await Promise.all([getT(), getUnits()]);
  if (rounds.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        {rich(t("history.noRounds"), {
          b: (text) => <span className="font-medium">{text}</span>,
        })}
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
                  <p className="font-medium">{round.shop ?? t("serviceRound.button")}</p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {[
                      u.date(round.date, "d MMM yyyy"),
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
                    {partName(e.part, t)}
                    <span className="text-muted-foreground">
                      {" "}
                      · {t(`events.typesLower.${e.type}`)}
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
