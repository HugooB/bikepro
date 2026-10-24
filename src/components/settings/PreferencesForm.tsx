"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { updatePreferences } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChoiceChip } from "@/components/wizard/fields";
import type { DistanceUnit } from "@/db/schema";
import { localeNames, locales, type Locale } from "@/i18n";
import { useT } from "@/i18n/client";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { allCurrencies, COMMON_CURRENCIES, formatMoney, type Prefs } from "@/lib/units";

const selectClass =
  "border-input bg-background focus-visible:ring-ring/50 h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3";

/** Settings → Preferences: the language, kilometres or miles, and the currency. */
export function PreferencesForm({ prefs }: { prefs: Prefs }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePreferences,
    initialActionState,
  );
  const [locale, setLocale] = useState<Locale>(prefs.locale);
  const [unit, setUnit] = useState<DistanceUnit>(prefs.distanceUnit);
  const [currency, setCurrency] = useState(prefs.currency);
  const changed =
    locale !== prefs.locale || unit !== prefs.distanceUnit || currency !== prefs.currency;

  // Currency names in the language the page is shown in. Plain "en" keeps the names English
  // users always saw ("Russian Ruble"; en-IE would say "Rouble").
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(prefs.locale, { type: "currency" });
    const option = (code: string) => ({ code, name: names.of(code) ?? code });
    const common = new Set(COMMON_CURRENCIES);
    return {
      common: COMMON_CURRENCIES.map(option),
      // Every other code, by name, so any currency can be picked.
      rest: allCurrencies()
        .filter((c) => !common.has(c))
        .map(option)
        .sort((a, b) => a.name.localeCompare(b.name, prefs.locale)),
    };
  }, [prefs.locale]);

  useEffect(() => {
    if (state.ok) toast.success(t("settings.preferences.saved"));
    else if (state.error) toast.error(state.error);
    // Only react to a new save result; after a language change `t` is already the new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="bg-card flex flex-col gap-4 rounded-xl border px-4 py-4">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="locale">{t("settings.preferences.language")}</Label>
        <select
          id="locale"
          name="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className={selectClass}
        >
          {locales.map((l) => (
            <option key={l} value={l} lang={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("settings.preferences.distances")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <ChoiceChip
            name="distanceUnitChoice"
            checked={unit === "km"}
            onChange={() => setUnit("km")}
          >
            {t("settings.preferences.kilometres")}
          </ChoiceChip>
          <ChoiceChip
            name="distanceUnitChoice"
            checked={unit === "mi"}
            onChange={() => setUnit("mi")}
          >
            {t("settings.preferences.miles")}
          </ChoiceChip>
        </div>
        <input type="hidden" name="distanceUnit" value={unit} />
      </fieldset>
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="currency">{t("settings.preferences.currency")}</Label>
        <select
          id="currency"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-describedby="currency-hint"
          className={selectClass}
        >
          <optgroup label={t("settings.preferences.commonCurrencies")}>
            {options.common.map((c) => (
              <option key={c.code} value={c.code}>
                {`${c.name} (${c.code})`}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("settings.preferences.allCurrencies")}>
            {options.rest.map((c) => (
              <option key={c.code} value={c.code}>
                {`${c.name} (${c.code})`}
              </option>
            ))}
          </optgroup>
        </select>
        <p id="currency-hint" className="text-muted-foreground text-xs">
          {t("settings.preferences.currencyHint", {
            example: formatMoney(1234.5, currency, locale),
          })}
        </p>
      </div>
      <Button type="submit" disabled={pending || !changed} className="self-start">
        {pending ? t("common.saving") : t("settings.preferences.save")}
      </Button>
    </form>
  );
}
