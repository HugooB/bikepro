import { cache } from "react";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { unitsFor, DEFAULT_PREFS, type Prefs, type Units } from "@/lib/units";
import { localeFromHeader, makeT, type Locale, type T } from "./index";

// Server components, server actions and route handlers get the language and formatting here.
// Signed-in users get what they picked under Settings → Preferences; visitors get their
// browser's language (Accept-Language) and the default units.

/** The preferences for this request. Checked once per request. */
export const getPrefs = cache(async (): Promise<Prefs> => {
  const user = await getCurrentUser();
  if (user)
    return { distanceUnit: user.distanceUnit, currency: user.currency, locale: user.locale };
  return { ...DEFAULT_PREFS, locale: await browserLocale() };
});

/** The language the visitor's browser asks for, e.g. when registering. */
export async function browserLocale(): Promise<Locale> {
  return localeFromHeader((await headers()).get("accept-language"));
}

export async function getLocale(): Promise<Locale> {
  return (await getPrefs()).locale;
}

export async function getT(): Promise<T> {
  return makeT(await getLocale());
}

/** Distances, amounts and dates formatted for this user (see lib/units). */
export async function getUnits(): Promise<Units> {
  return unitsFor(await getPrefs());
}
