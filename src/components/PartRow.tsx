"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Part } from "@/db/schema";
import { useT, useUnits } from "@/i18n/client";
import { formatAge, kmSince } from "@/lib/age";
import type { PartStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { isBikeZone } from "@/lib/zones";
import { useZones } from "./bike/zone-context";
import { StatusDot, statusTextClass } from "./StatusBadge";

type Props = {
  part: Part;
  status: PartStatus;
  odometerKm: number;
  /** First row of its zone; it alone stands in for the zone when picked in the drawing. */
  firstOfZone: boolean;
};

export function PartRow({ part, status, odometerKm, firstOfZone }: Props) {
  const { activeZone, activePartId, setActivePart, flashedZone } = useZones();
  const t = useT();
  const u = useUnits();
  const zone = isBikeZone(part.svgZone) ? part.svgZone : null;
  // Only one row lights up at a time: the hovered row itself, or, when a zone is picked in
  // the drawing, the first row of that zone (pedals and cleats share one).
  const linked =
    activePartId !== null
      ? activePartId === part.id
      : zone !== null && firstOfZone && (activeZone === zone || flashedZone === zone);
  const enter = () => setActivePart({ id: part.id, zone });
  const leave = () => setActivePart(null);

  return (
    <li data-part-zone={zone ?? undefined} className="scroll-mt-24">
      <Link
        href={`/bikes/${part.bikeId}/parts/${part.id}`}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={enter}
        onBlur={leave}
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-[background-color,box-shadow] duration-200 focus-visible:outline-none",
          // Rows sharing a zone (pedals and cleats) light up together, so the linked style must
          // win over hover; otherwise the hovered row looks different from its siblings.
          linked
            ? "bg-brand/[0.07] shadow-[inset_3px_0_0_var(--brand)]"
            : "hover:bg-muted/60 focus-visible:bg-muted/60",
        )}
      >
        <StatusDot level={status.level} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{part.name}</p>
          <p className={`truncate text-sm ${statusTextClass(status.level)}`}>{status.condition}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium tabular-nums">{formatAge(part.installedAt, new Date(), t)}</p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {u.distance(kmSince(part.installedKm, odometerKm))}
          </p>
        </div>
        <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
