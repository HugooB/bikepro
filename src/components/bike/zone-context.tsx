"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { BikeZone } from "@/lib/zones";

type ZoneContextValue = {
  /** Zone under the pointer or keyboard focus, in either the drawing or the list. */
  activeZone: BikeZone | null;
  setActiveZone: (zone: BikeZone | null) => void;
  /** Part row under the pointer or keyboard focus; only that row is highlighted in the list. */
  activePartId: number | null;
  /** Hovering a row also lights up its zone in the drawing. */
  setActivePart: (part: { id: number; zone: BikeZone | null } | null) => void;
  /** Zone just picked in the drawing; its parts are briefly highlighted in the list. */
  flashedZone: BikeZone | null;
  /** Scrolls the list to the zone's first part and highlights its rows. */
  revealZone: (zone: BikeZone) => void;
};

const ZoneContext = createContext<ZoneContextValue | null>(null);

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [activeZone, setZone] = useState<BikeZone | null>(null);
  const [activePartId, setActivePartId] = useState<number | null>(null);
  const [flashedZone, setFlashedZone] = useState<BikeZone | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setActiveZone = useCallback((zone: BikeZone | null) => {
    setZone(zone);
    setActivePartId(null);
  }, []);

  const setActivePart = useCallback((part: { id: number; zone: BikeZone | null } | null) => {
    setZone(part?.zone ?? null);
    setActivePartId(part?.id ?? null);
  }, []);

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
    () => ({ activeZone, setActiveZone, activePartId, setActivePart, flashedZone, revealZone }),
    [activeZone, setActiveZone, activePartId, setActivePart, flashedZone, revealZone],
  );
  return <ZoneContext.Provider value={value}>{children}</ZoneContext.Provider>;
}

export function useZones() {
  const ctx = useContext(ZoneContext);
  if (!ctx) throw new Error("useZones must be used inside <ZoneProvider>");
  return ctx;
}
