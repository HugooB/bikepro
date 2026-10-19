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

const kmFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatKm(km: number): string {
  return `${kmFormatter.format(km)} km`;
}
