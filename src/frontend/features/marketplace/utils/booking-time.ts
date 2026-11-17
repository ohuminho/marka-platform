const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Returns the weekday in the space's timezone, not the device/browser timezone.
 * Booking availability is evaluated by the API in the same IANA timezone.
 */
export function weekdayInTimeZone(date: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const weekday = WEEKDAYS.indexOf(label as (typeof WEEKDAYS)[number]);
  if (weekday < 0) throw new Error("Unable to resolve weekday for the supplied timezone.");
  return weekday;
}
