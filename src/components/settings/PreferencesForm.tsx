"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { updatePreferences } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChoiceChip } from "@/components/wizard/fields";
import type { DistanceUnit } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { allCurrencies, COMMON_CURRENCIES, formatMoney, type Prefs } from "@/lib/units";

/** Settings → Preferences: kilometres or miles, and the currency amounts are shown in. */
export function PreferencesForm({ prefs }: { prefs: Prefs }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePreferences,
    initialActionState,
  );
  const [unit, setUnit] = useState<DistanceUnit>(prefs.distanceUnit);
  const [currency, setCurrency] = useState(prefs.currency);
  const changed = unit !== prefs.distanceUnit || currency !== prefs.currency;

  const options = useMemo(() => {
    const names = new Intl.DisplayNames("en", { type: "currency" });
    const option = (code: string) => ({ code, name: names.of(code) ?? code });
    const common = new Set(COMMON_CURRENCIES);
    return {
      common: COMMON_CURRENCIES.map(option),
      // Every other code, by name, so any currency can be picked.
      rest: allCurrencies()
        .filter((c) => !common.has(c))
        .map(option)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, []);

  useEffect(() => {
    if (state.ok) toast.success("Preferences saved");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="bg-card flex flex-col gap-4 rounded-xl border px-4 py-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Distances</legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <ChoiceChip
            name="distanceUnitChoice"
            checked={unit === "km"}
            onChange={() => setUnit("km")}
          >
            Kilometres
          </ChoiceChip>
          <ChoiceChip
            name="distanceUnitChoice"
            checked={unit === "mi"}
            onChange={() => setUnit("mi")}
          >
            Miles
          </ChoiceChip>
        </div>
        <input type="hidden" name="distanceUnit" value={unit} />
      </fieldset>
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-describedby="currency-hint"
          className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <optgroup label="Common">
            {options.common.map((c) => (
              <option key={c.code} value={c.code}>
                {`${c.name} (${c.code})`}
              </option>
            ))}
          </optgroup>
          <optgroup label="All currencies">
            {options.rest.map((c) => (
              <option key={c.code} value={c.code}>
                {`${c.name} (${c.code})`}
              </option>
            ))}
          </optgroup>
        </select>
        <p id="currency-hint" className="text-muted-foreground text-xs">
          Amounts look like {formatMoney(1234.5, currency)}. They aren&apos;t converted: a price you
          entered stays the same number.
        </p>
      </div>
      <Button type="submit" disabled={pending || !changed} className="self-start">
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
