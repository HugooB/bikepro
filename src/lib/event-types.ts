import type { PartEventType } from "@/db/schema";

export const eventTypeLabels: Record<PartEventType, string> = {
  installed: "Installed",
  serviced: "Serviced",
  cleaned: "Cleaned",
  adjusted: "Adjusted",
  replaced: "Replaced",
  note: "Note",
};

/** Types a user can log by hand ("installed" is created when a part is added). */
export const loggableEventTypes = ["serviced", "cleaned", "adjusted", "replaced", "note"] as const;
export type LoggableEventType = (typeof loggableEventTypes)[number];

/** Whether logging this type restarts the service interval by default. */
export const resetsByDefault: Record<LoggableEventType, boolean> = {
  serviced: true,
  cleaned: false,
  adjusted: false,
  replaced: true,
  note: false,
};

export const descriptionPlaceholders: Record<LoggableEventType, string> = {
  serviced: "e.g. Bearings greased",
  cleaned: "e.g. Degreased and re-lubed",
  adjusted: "e.g. Indexing tuned",
  replaced: "e.g. New chain fitted, Shimano CN-M8100",
  note: "e.g. Slight creak when climbing",
};
