// Their labels are in the dictionary under events.types and events.placeholders.

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

/** Actions a shop can perform on a part during a service round. */
export const serviceActions = ["serviced", "cleaned", "adjusted", "replaced"] as const;
export type ServiceAction = (typeof serviceActions)[number];
