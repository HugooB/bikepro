import type { DistanceUnit } from "@/db/schema";

// Distances are stored in km and amounts as plain numbers. Everything a user sees or types
// goes through here, in the unit and currency they picked under Settings → Preferences.

export type Prefs = { distanceUnit: DistanceUnit; currency: string };

export const DEFAULT_PREFS: Prefs = { distanceUnit: "km", currency: "EUR" };

export const KM_PER_MILE = 1.609344;

/** Km → the user's unit. */
export const toUnit = (km: number, unit: DistanceUnit) => (unit === "mi" ? km / KM_PER_MILE : km);

/** The user's unit → km. */
export const fromUnit = (value: number, unit: DistanceUnit) =>
  unit === "mi" ? value * KM_PER_MILE : value;

/** A stored distance as forms show it: whole numbers in the user's unit. */
export const toInput = (km: number, unit: DistanceUnit) => Math.round(toUnit(km, unit));

/**
 * A distance typed into a form, in km. When the form still shows the value it was filled with,
 * `currentKm` is kept as it is, so saving a form without changing it never moves the stored
 * value (8412.4 km is shown as 8412 km or 5227 mi; neither turns back into exactly 8412.4).
 */
export function inputToKm(value: number, unit: DistanceUnit, currentKm?: number | null): number {
  if (currentKm != null && value === toInput(currentKm, unit)) return currentKm;
  return fromUnit(value, unit);
}

/** Like inputToKm, for intervals, which are stored as whole km. */
export const intervalToKm = (value: number, unit: DistanceUnit, currentKm?: number | null) =>
  Math.round(inputToKm(value, unit, currentKm));

/**
 * A default interval in the user's unit, rounded the way a person would write it:
 * 3000 km is 1,864 mi, shown as 1,850.
 */
export function niceInterval(km: number, unit: DistanceUnit): number {
  if (unit === "km") return km;
  const value = toUnit(km, unit);
  const step = value < 500 ? 10 : value < 2000 ? 50 : value < 10_000 ? 100 : 500;
  return Math.max(step, Math.round(value / step) * step);
}

const unitNames: Record<DistanceUnit, { short: string; long: string }> = {
  km: { short: "km", long: "kilometres" },
  mi: { short: "mi", long: "miles" },
};

export const unitName = (unit: DistanceUnit, style: "short" | "long" = "short") =>
  unitNames[unit][style];

const distanceFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "8,412 km" or "5,227 mi". */
export function formatDistance(km: number, unit: DistanceUnit): string {
  return `${distanceFormatter.format(toUnit(km, unit))} ${unitName(unit)}`;
}

// en-IE keeps euro amounts exactly as they were before currencies existed: "€1,234.50".
const LOCALE = "en-IE";
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, compact = false) {
  const key = `${currency}:${compact}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(compact && { notation: "compact", maximumFractionDigits: 1 }),
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

/** "€1,234.50", "$1,234.50", "¥1,235". */
export function formatMoney(amount: number, currency: string): string {
  return moneyFormatter(currency).format(amount);
}

/** Short amounts for chart labels: "€80", "$1.2K". */
export function formatMoneyShort(amount: number, currency: string): string {
  if (amount >= 1000) return moneyFormatter(currency, true).format(amount);
  return formatMoney(Math.round(amount), currency).replace(/[.,]00$/, "");
}

/** The currency's symbol for form labels: "€", "$", "CHF". */
export function currencySymbol(currency: string): string {
  return (
    moneyFormatter(currency)
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

/** Currencies most riders use, listed first in Settings. */
export const COMMON_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "JPY",
];

/** Every ISO 4217 code this runtime can format. */
export function allCurrencies(): string[] {
  return Intl.supportedValuesOf("currency");
}

export function isCurrency(code: string): boolean {
  return /^[A-Z]{3}$/.test(code) && allCurrencies().includes(code);
}

/** One user's formatting, bound to their preferences. */
export function unitsFor(prefs: Prefs) {
  const { distanceUnit: unit, currency } = prefs;
  return {
    unit,
    currency,
    /** "km" or "mi". */
    unitLabel: unitName(unit),
    /** "kilometres" or "miles". */
    unitLong: unitName(unit, "long"),
    currencySymbol: currencySymbol(currency),
    distance: (km: number) => formatDistance(km, unit),
    money: (amount: number) => formatMoney(amount, currency),
    moneyShort: (amount: number) => formatMoneyShort(amount, currency),
    toInput: (km: number) => toInput(km, unit),
  };
}

export type Units = ReturnType<typeof unitsFor>;
