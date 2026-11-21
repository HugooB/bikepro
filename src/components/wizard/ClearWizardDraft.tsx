"use client";

import { useEffect } from "react";
import { clearSavedWizard } from "./wizard-state";

/**
 * On the sign-in page: forgets a half-filled new-bike draft from this browser tab, so it isn't
 * left behind after signing out (or shown to the next person who signs in).
 */
export function ClearWizardDraft() {
  useEffect(() => clearSavedWizard(), []);
  return null;
}
