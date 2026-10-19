const costFormatter = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatCost(amount: number): string {
  return costFormatter.format(amount);
}

/** Months shown in forms ↔ days stored in the database. */
export const daysToMonths = (days: number) => Math.round((days * 12) / 365);
export const monthsToDays = (months: number) => Math.round((months * 365) / 12);
