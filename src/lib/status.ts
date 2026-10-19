import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatDays, formatKm } from "./age";

export type StatusLevel = "ok" | "due" | "overdue" | "none";

export type PartStatus = {
  level: StatusLevel;
  /** Share of the service interval used up (0 = fresh, 1 = due). Null when the part has no interval. */
  ratio: number | null;
  /** Short human hint, e.g. "Due in 550 km" or "Overdue by 2 mo". */
  hint: string;
  /** Date ("YYYY-MM-DD") and odometer km the interval is counted from. */
  since: { date: string; km: number };
};

export const statusLabels: Record<StatusLevel, string> = {
  ok: "Good",
  due: "Due soon",
  overdue: "Overdue",
  none: "No interval",
};

/** Ratio at which a part turns from "ok" to "due soon". */
export const DUE_SOON_RATIO = 0.75;

type StatusInput = {
  installedAt: string;
  installedKm: number;
  intervalKm: number | null;
  intervalDays: number | null;
};

type ResetPoint = { date: string; odometerKm: number | null };

/**
 * Wear status of a part. The interval counts from the latest event that reset it
 * (e.g. a service), or from installation when there is none.
 */
export function computeStatus(
  part: StatusInput,
  lastReset: ResetPoint | null,
  odometerKm: number,
  now: Date = new Date(),
): PartStatus {
  const since =
    lastReset && lastReset.date >= part.installedAt
      ? { date: lastReset.date, km: lastReset.odometerKm ?? part.installedKm }
      : { date: part.installedAt, km: part.installedKm };

  const usedKm = Math.max(0, odometerKm - since.km);
  const usedDays = Math.max(0, differenceInCalendarDays(now, parseISO(since.date)));

  const kmRatio = part.intervalKm ? usedKm / part.intervalKm : null;
  const dayRatio = part.intervalDays ? usedDays / part.intervalDays : null;

  if (kmRatio === null && dayRatio === null) {
    return { level: "none", ratio: null, hint: statusLabels.none, since };
  }

  // The dimension that is furthest along decides the status.
  const byKm = (kmRatio ?? -1) >= (dayRatio ?? -1);
  const ratio = byKm ? kmRatio! : dayRatio!;
  const level: StatusLevel = ratio >= 1 ? "overdue" : ratio >= DUE_SOON_RATIO ? "due" : "ok";

  const remaining = byKm ? part.intervalKm! - usedKm : part.intervalDays! - usedDays;
  const amount = byKm ? formatKm(Math.abs(remaining)) : formatDays(Math.abs(remaining));
  const hint =
    remaining < 0 ? `Overdue by ${amount}` : remaining === 0 ? "Due now" : `Due in ${amount}`;

  return { level, ratio, hint, since };
}
