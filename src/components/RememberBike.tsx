"use client";

import { useEffect } from "react";
import { lastBikeCookie } from "@/lib/last-bike";

/** Remembers the bike on screen, so opening the app later returns to it. */
export function RememberBike({ bikeId }: { bikeId: number }) {
  useEffect(() => {
    document.cookie = `${lastBikeCookie}=${bikeId}; path=/; max-age=31536000; samesite=lax`;
  }, [bikeId]);
  return null;
}
