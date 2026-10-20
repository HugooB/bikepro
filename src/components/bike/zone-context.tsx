"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { BikeZone } from "@/lib/zones";

type ZoneContextValue = {
  /** Zone under the pointer or keyboard focus, in either the drawing or the list. */
  activeZone: BikeZone | null;
  setActiveZone: (zone: BikeZone | null) => void;
  /** Zone just picked in the drawing; its parts are briefly highlighted in the list. */
  flashedZone: BikeZone | null;
  /** Scrolls the list to the zone's first part and highlights its rows. */
  revealZone: (zone: BikeZone) => void;
};

const ZoneContext = createContext<ZoneContextValue | null>(null);

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [activeZone, setActiveZone] = useState<BikeZone | null>(null);
  const [flashedZone, setFlashedZone] = useState<BikeZone | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const revealZone = useCallback((zone: BikeZone) => {
    const row = document.querySelector<HTMLElement>(`[data-part-zone="${zone}"]`);
    if (row) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      row.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    setFlashedZone(zone);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashedZone(null), 1800);
  }, []);

  const value = useMemo(
    () => ({ activeZone, setActiveZone, flashedZone, revealZone }),
    [activeZone, flashedZone, revealZone],
  );
  return <ZoneContext.Provider value={value}>{children}</ZoneContext.Provider>;
}

export function useZones() {
  const ctx = useContext(ZoneContext);
  if (!ctx) throw new Error("useZones must be used inside <ZoneProvider>");
  return ctx;
}
