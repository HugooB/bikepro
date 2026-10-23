"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Part } from "@/db/schema";
import { formatAge, kmSince } from "@/lib/age";
import type { PartStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { isBikeZone } from "@/lib/zones";
import { useZones } from "./bike/zone-context";
import { StatusDot, statusTextClass } from "./StatusBadge";
import { useUnits } from "./UnitsProvider";

type Props = { part: Part; status: PartStatus; odometerKm: number };

export function PartRow({ part, status, odometerKm }: Props) {
  const { activeZone, setActiveZone, flashedZone } = useZones();
  const u = useUnits();
  const zone = isBikeZone(part.svgZone) ? part.svgZone : null;
  const linked = zone !== null && (activeZone === zone || flashedZone === zone);
  const enter = () => zone && setActiveZone(zone);
  const leave = () => zone && setActiveZone(null);

  return (
    <li data-part-zone={zone ?? undefined} className="scroll-mt-24">
      <Link
        href={`/bikes/${part.bikeId}/parts/${part.id}`}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={enter}
        onBlur={leave}
        className={cn(
          "hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors duration-200 focus-visible:outline-none",
          linked && "bg-brand/[0.07] shadow-[inset_3px_0_0_var(--brand)]",
        )}
      >
        <StatusDot level={status.level} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{part.name}</p>
          <p className={`truncate text-sm ${statusTextClass(status.level)}`}>{status.condition}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium tabular-nums">{formatAge(part.installedAt)}</p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {u.distance(kmSince(part.installedKm, odometerKm))}
          </p>
        </div>
        <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
