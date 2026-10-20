import type { StatusLevel } from "./status";

/** Areas of the bike drawing a part can light up (see default-parts.ts `svgZone`). */
export const bikeZones = [
  "tire_rear",
  "wheel_rear",
  "tire_front",
  "wheel_front",
  "brake_rear",
  "brake_front",
  "cassette",
  "chain",
  "chainrings",
  "bottom_bracket",
  "derailleur_front",
  "derailleur_rear",
  "pedals",
  "saddle",
  "handlebar",
  "headset",
  "cables",
] as const;
export type BikeZone = (typeof bikeZones)[number];

export function isBikeZone(zone: string | null | undefined): zone is BikeZone {
  return !!zone && (bikeZones as readonly string[]).includes(zone);
}

const severity: Record<StatusLevel, number> = { none: 0, ok: 1, due: 2, overdue: 3 };

export type ZonePart = {
  id: number;
  name: string;
  zone: string | null;
  level: StatusLevel;
  hint: string;
};

export type ZoneSummary = {
  zone: BikeZone;
  /** The most urgent status among the zone's parts. */
  level: StatusLevel;
  parts: ZonePart[];
};

/** Groups parts by drawing zone; zones without active parts are left out. */
export function summarizeZones(parts: ZonePart[]): Map<BikeZone, ZoneSummary> {
  const zones = new Map<BikeZone, ZoneSummary>();
  for (const part of parts) {
    if (!isBikeZone(part.zone)) continue;
    const entry = zones.get(part.zone) ?? {
      zone: part.zone,
      level: "none" as StatusLevel,
      parts: [],
    };
    entry.parts.push(part);
    if (severity[part.level] > severity[entry.level]) entry.level = part.level;
    zones.set(part.zone, entry);
  }
  return zones;
}
