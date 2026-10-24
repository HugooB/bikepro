import { differenceInCalendarDays, parseISO } from "date-fns";
import type { DistanceUnit } from "@/db/schema";
import { DEFAULT_LOCALE, makeT, type Locale, type T } from "@/i18n";
import { formatDays } from "./age";
import { formatDistance } from "./units";

// Every part has two intervals, each in km and/or days (whichever comes first):
// - service: how often it needs servicing (cleaning, lubing, adjusting, a bleed). Counted from
//   the latest event that restarted it, or from installation.
// - replacement: its maximum life. Counted from installation; replacing the part starts a new
//   part with a fresh count.
// The part's condition comes from whichever of the two is furthest along.

export type StatusLevel = "ok" | "due" | "overdue" | "none";

export type IntervalStatus = {
  level: Exclude<StatusLevel, "none">;
  /** Share of the interval used up (0 = fresh, 1 = due). */
  ratio: number;
  /** e.g. "in 550 km", "overdue by 2 mo", "due now", in the user's distance unit. */
  hint: string;
  /** Date ("YYYY-MM-DD") and odometer km the interval is counted from. */
  since: { date: string; km: number };
};

export type PartStatus = {
  level: StatusLevel;
  /** The part's condition in words, e.g. "Good condition" or "Replace soon". */
  condition: string;
  service: IntervalStatus | null;
  replace: IntervalStatus | null;
};

/** Ratio at which a part turns from "ok" to "due soon". */
export const DUE_SOON_RATIO = 0.75;
/** Below this ratio a part is in good condition; up to DUE_SOON_RATIO it's fair. */
const FAIR_RATIO = 0.5;

export type IntervalInput = {
  installedAt: string;
  installedKm: number;
  serviceIntervalKm: number | null;
  serviceIntervalDays: number | null;
  replaceIntervalKm: number | null;
  replaceIntervalDays: number | null;
};

type ResetPoint = { date: string; odometerKm: number | null };

const severity: Record<StatusLevel, number> = { none: 0, ok: 1, due: 2, overdue: 3 };

function track(
  since: { date: string; km: number },
  intervalKm: number | null,
  intervalDays: number | null,
  odometerKm: number,
  now: Date,
  unit: DistanceUnit,
  locale: Locale,
  t: T,
): IntervalStatus | null {
  const usedKm = Math.max(0, odometerKm - since.km);
  const usedDays = Math.max(0, differenceInCalendarDays(now, parseISO(since.date)));
  const kmRatio = intervalKm ? usedKm / intervalKm : null;
  const dayRatio = intervalDays ? usedDays / intervalDays : null;
  if (kmRatio === null && dayRatio === null) return null;

  // The dimension that is furthest along decides.
  const byKm = (kmRatio ?? -1) >= (dayRatio ?? -1);
  const ratio = byKm ? kmRatio! : dayRatio!;
  const level = ratio >= 1 ? "overdue" : ratio >= DUE_SOON_RATIO ? "due" : "ok";
  const remaining = byKm ? intervalKm! - usedKm : intervalDays! - usedDays;
  const amount = byKm
    ? formatDistance(Math.abs(remaining), unit, locale)
    : formatDays(Math.abs(remaining), t);
  const hint =
    remaining < 0
      ? t("status.overdueBy", { amount })
      : remaining === 0
        ? t("status.dueNow")
        : t("status.dueIn", { amount });
  return { level, ratio, hint, since };
}

/** Service and replacement status of a part, and its condition in words. */
export function computeStatus(
  part: IntervalInput,
  lastService: ResetPoint | null,
  odometerKm: number,
  {
    now = new Date(),
    unit = "km",
    locale = DEFAULT_LOCALE,
  }: { now?: Date; unit?: DistanceUnit; locale?: Locale } = {},
): PartStatus {
  const t = makeT(locale);
  const installed = { date: part.installedAt, km: part.installedKm };
  const serviced =
    lastService && lastService.date >= part.installedAt
      ? { date: lastService.date, km: lastService.odometerKm ?? part.installedKm }
      : installed;

  const service = track(
    serviced,
    part.serviceIntervalKm,
    part.serviceIntervalDays,
    odometerKm,
    now,
    unit,
    locale,
    t,
  );
  const replace = track(
    installed,
    part.replaceIntervalKm,
    part.replaceIntervalDays,
    odometerKm,
    now,
    unit,
    locale,
    t,
  );
  if (!service && !replace) {
    return { level: "none", condition: t("status.noIntervals"), service, replace };
  }

  // The more urgent interval decides; on a tie, replacing matters more than servicing.
  const [kind, driver] =
    replace && (!service || severity[replace.level] >= severity[service.level])
      ? (["replace", replace] as const)
      : (["service", service!] as const);
  const worstRatio = Math.max(service?.ratio ?? 0, replace?.ratio ?? 0);
  const condition =
    driver.level === "ok"
      ? worstRatio < FAIR_RATIO
        ? t("status.good")
        : t("status.fair")
      : t(`status.${kind}.${driver.level}`);

  return { level: driver.level, condition, service, replace };
}
