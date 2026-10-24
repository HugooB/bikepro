import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from "date-fns";
import { tEn, type T } from "@/i18n";

/**
 * Compact age of something installed on `date` ("YYYY-MM-DD"), e.g. "Today", "5 days",
 * "3 wk", "7 mo", "2y", "1y 3m".
 */
export function formatAge(date: string, now: Date = new Date(), t: T = tEn): string {
  const start = parseISO(date);
  const days = differenceInCalendarDays(now, start);

  if (days <= 0) return t("age.today");
  if (days < 14) return t("age.days", { count: days });

  // Full months elapsed (calendar months, minus one if the day-of-month hasn't been reached yet).
  let months = differenceInCalendarMonths(now, start);
  if (now.getDate() < start.getDate()) months -= 1;

  if (months < 2) return t("age.weeks", { count: Math.floor(days / 7) });
  return months12(months, t);
}

function months12(months: number, t: T) {
  if (months < 12) return t("age.months", { count: months });
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0
    ? t("age.years", { count: years })
    : t("age.yearsMonths", { years, months: rest });
}

/** Kilometres ridden since a part was installed, never negative. */
export function kmSince(installedKm: number, odometerKm: number): number {
  return Math.max(0, Math.round(odometerKm - installedKm));
}

/** Compact length of a span of days, e.g. "5 days", "3 wk", "4 mo", "1y 2m". */
export function formatDays(days: number, t: T = tEn): string {
  const d = Math.max(0, Math.round(days));
  if (d < 14) return t("age.days", { count: d });
  if (d < 61) return t("age.weeks", { count: Math.floor(d / 7) });
  return months12(Math.floor(d / (365 / 12)), t);
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
