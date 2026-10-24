"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_PREFS, unitsFor, type Prefs, type Units } from "@/lib/units";
import { makeT, type T } from "./index";

// Client components translate and format with the preferences the root layout passes in.
// The dictionaries themselves are bundled, so only the preferences cross from the server.

const PrefsContext = createContext<Prefs>(DEFAULT_PREFS);

export function PrefsProvider({ prefs, children }: { prefs: Prefs; children: React.ReactNode }) {
  return <PrefsContext value={prefs}>{children}</PrefsContext>;
}

export function useT(): T {
  const { locale } = useContext(PrefsContext);
  return useMemo(() => makeT(locale), [locale]);
}

export function useUnits(): Units {
  const { distanceUnit, currency, locale } = useContext(PrefsContext);
  return useMemo(
    () => unitsFor({ distanceUnit, currency, locale }),
    [distanceUnit, currency, locale],
  );
}
