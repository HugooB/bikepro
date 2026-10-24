import { format as formatDateFns, parseISO, type Locale as DateFnsLocale } from "date-fns";
import { enUS, nl } from "date-fns/locale";
import type { DistanceUnit } from "@/db/schema";
import { DEFAULT_LOCALE, translate, type Locale } from "@/i18n";

// Distances are stored in km and amounts as plain numbers. Everything a user sees or types
// goes through here, in the unit, currency and language they picked under Settings →
// Preferences. Dates are formatted here too, so they follow the language.

export type Prefs = { distanceUnit: DistanceUnit; currency: string; locale: Locale };

export const DEFAULT_PREFS: Prefs = { distanceUnit: "km", currency: "EUR", locale: DEFAULT_LOCALE };

// en-IE keeps English numbers and euro amounts exactly as they were before: "12,345", "€1,234.50".
const intlLocales: Record<Locale, string> = { en: "en-IE", nl: "nl-NL" };
const dateFnsLocales: Record<Locale, DateFnsLocale> = { en: enUS, nl };

/** The BCP 47 tag `Intl` formats with for a language. */
export const intlLocale = (locale: Locale) => intlLocales[locale];

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

/** "km" or "mi"; the same in every language BikePro has. */
export const unitName = (unit: DistanceUnit) => unit;

const formatters = new Map<string, Intl.NumberFormat>();

function cached(key: string, make: () => Intl.NumberFormat) {
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = make()));
  return f;
}

const numberFormatter = (locale: Locale) =>
  cached(
    `n:${locale}`,
    () => new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }),
  );

/** "8,412 km" or "5,227 mi" ("8.412 km" in Dutch). */
export function formatDistance(km: number, unit: DistanceUnit, locale: Locale = "en"): string {
  return `${numberFormatter(locale).format(toUnit(km, unit))} ${unitName(unit)}`;
}

function moneyFormatter(currency: string, locale: Locale, compact = false) {
  return cached(
    `m:${locale}:${currency}:${compact}`,
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        ...(compact && { notation: "compact", maximumFractionDigits: 1 }),
      }),
  );
}

/** "€1,234.50", "$1,234.50", "¥1,235" ("€ 1.234,50" in Dutch). */
export function formatMoney(amount: number, currency: string, locale: Locale = "en"): string {
  return moneyFormatter(currency, locale).format(amount);
}

/** Short amounts for chart labels: "€80", "$1.2K". */
export function formatMoneyShort(amount: number, currency: string, locale: Locale = "en"): string {
  if (amount >= 1000) return moneyFormatter(currency, locale, true).format(amount);
  return formatMoney(Math.round(amount), currency, locale).replace(/[.,]00$/, "");
}

/** The currency's symbol for form labels: "€", "$", "CHF". */
export function currencySymbol(currency: string): string {
  return (
    moneyFormatter(currency, "en")
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

/** A "YYYY-MM-DD" date or a Date with a date-fns pattern, e.g. "d MMM yyyy", in `locale`. */
export function formatDate(date: string | Date, pattern: string, locale: Locale = "en"): string {
  return formatDateFns(typeof date === "string" ? parseISO(date) : date, pattern, {
    locale: dateFnsLocales[locale],
  });
}

/** One user's formatting, bound to their preferences. */
export function unitsFor(prefs: Prefs) {
  const { distanceUnit: unit, currency, locale } = prefs;
  return {
    unit,
    currency,
    locale,
    /** "km" or "mi". */
    unitLabel: unitName(unit),
    /** "kilometers" or "miles", in the user's language. */
    unitLong: translate(locale, unit === "mi" ? "units.miles" : "units.kilometers"),
    currencySymbol: currencySymbol(currency),
    distance: (km: number) => formatDistance(km, unit, locale),
    money: (amount: number) => formatMoney(amount, currency, locale),
    moneyShort: (amount: number) => formatMoneyShort(amount, currency, locale),
    number: (n: number) => numberFormatter(locale).format(n),
    date: (date: string | Date, pattern: string) => formatDate(date, pattern, locale),
    /** For date-fns functions that take a locale, such as formatDistanceToNowStrict. */
    dateFnsLocale: dateFnsLocales[locale],
    toInput: (km: number) => toInput(km, unit),
  };
}

export type Units = ReturnType<typeof unitsFor>;
