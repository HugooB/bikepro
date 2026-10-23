import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from "date-fns";

/**
 * Compact age of something installed on `date` ("YYYY-MM-DD"), e.g. "Today", "5 days",
 * "3 wk", "7 mo", "2y", "1y 3m".
 */
export function formatAge(date: string, now: Date = new Date()): string {
  const start = parseISO(date);
  const days = differenceInCalendarDays(now, start);

  if (days <= 0) return "Today";
  if (days < 14) return days === 1 ? "1 day" : `${days} days`;

  // Full months elapsed (calendar months, minus one if the day-of-month hasn't been reached yet).
  let months = differenceInCalendarMonths(now, start);
  if (now.getDate() < start.getDate()) months -= 1;

  if (months < 2) return `${Math.floor(days / 7)} wk`;
  if (months < 12) return `${months} mo`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years}y` : `${years}y ${rest}m`;
}

/** Kilometres ridden since a part was installed, never negative. */
export function kmSince(installedKm: number, odometerKm: number): number {
  return Math.max(0, Math.round(odometerKm - installedKm));
}

/** Compact length of a span of days, e.g. "5 days", "3 wk", "4 mo", "1y 2m". */
export function formatDays(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d < 14) return d === 1 ? "1 day" : `${d} days`;
  if (d < 61) return `${Math.floor(d / 7)} wk`;
  const months = Math.floor(d / (365 / 12));
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years}y` : `${years}y ${rest}m`;
}

type RetiredPart = {
  installedAt: string;
  installedKm: number;
  retiredAt: string | null;
  retiredKm: number | null;
};

/** How long (days) and how far (km) a replaced part lasted. */
export function partLifetime(part: RetiredPart) {
  const end = part.retiredAt ?? part.installedAt;
  return {
    days: Math.max(0, differenceInCalendarDays(parseISO(end), parseISO(part.installedAt))),
    km: Math.max(0, Math.round((part.retiredKm ?? part.installedKm) - part.installedKm)),
  };
}
