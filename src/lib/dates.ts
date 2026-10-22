import { z } from "zod";

/** True for a real calendar date in "YYYY-MM-DD" form, so "2026-02-31" and "2025-13-01" fail. */
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Form field holding a calendar date ("YYYY-MM-DD"). */
export const isoDate = z.string().refine(isRealDate, "Pick a date");
