"use client";

import { startTransition, useEffect } from "react";
import { autoSyncStrava } from "@/actions/strava";

/** Rendered when a Strava sync is due: syncs in the background once the page has loaded. */
export function StravaAutoSync() {
  useEffect(() => {
    startTransition(() => autoSyncStrava());
  }, []);
  return null;
}
