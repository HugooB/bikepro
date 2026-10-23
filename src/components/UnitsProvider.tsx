"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_PREFS, unitsFor, type Prefs, type Units } from "@/lib/units";

// Client components format distances and amounts with the signed-in user's preferences,
// which the root layout passes in. Server components use getUnits() instead.

const UnitsContext = createContext<Prefs>(DEFAULT_PREFS);

export function UnitsProvider({ prefs, children }: { prefs: Prefs; children: React.ReactNode }) {
  return <UnitsContext value={prefs}>{children}</UnitsContext>;
}

export function useUnits(): Units {
  const { distanceUnit, currency } = useContext(UnitsContext);
  return useMemo(() => unitsFor({ distanceUnit, currency }), [distanceUnit, currency]);
}
