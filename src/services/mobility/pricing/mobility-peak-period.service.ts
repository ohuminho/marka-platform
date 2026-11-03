export const MOBILITY_PEAK_TIME_ZONE = "Africa/Luanda";

export interface MobilityPeakWindow {
  /** Sunday = 0 ... Saturday = 6, in Africa/Luanda local time. */
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface MobilityPeakStatus {
  isPeakHour: boolean;
  timeZone: typeof MOBILITY_PEAK_TIME_ZONE;
  localDayOfWeek: number;
  localTime: string;
  matchedWindow: MobilityPeakWindow | null;
}

/**
 * Server-side peak-period evaluator. Callers must pass server time and
 * server-owned configuration; never accept a client-supplied peak flag.
 *
 * Window boundaries are [start, end). Overnight windows are supported.
 * Missing configuration intentionally means no peak promotion.
 */
export function evaluateMobilityPeakPeriod(
  at: Date,
  windows: readonly MobilityPeakWindow[],
): MobilityPeakStatus {
  if (!(at instanceof Date) || !Number.isFinite(at.getTime())) {
    throw new Error("Peak-period evaluation requires a valid date.");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOBILITY_PEAK_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const localDayOfWeek = weekdays[values.weekday];
  const localHour = Number(values.hour);
  const localMinute = Number(values.minute);
  const localMinutes = localHour * 60 + localMinute;
  const localTime = `${values.hour}:${values.minute}`;

  if (localDayOfWeek === undefined || !Number.isInteger(localMinutes)) {
    throw new Error("Unable to resolve Luanda local time.");
  }

  for (const window of windows) {
    validateWindow(window);
    const start = parseMinutes(window.start);
    const end = parseMinutes(window.end);

    if (start === end) {
      continue;
    }

    const matches = start < end
      ? window.dayOfWeek === localDayOfWeek && localMinutes >= start && localMinutes < end
      : (window.dayOfWeek === localDayOfWeek && localMinutes >= start) ||
        ((window.dayOfWeek + 1) % 7 === localDayOfWeek && localMinutes < end);

    if (matches) {
      return {
        isPeakHour: true,
        timeZone: MOBILITY_PEAK_TIME_ZONE,
        localDayOfWeek,
        localTime,
        matchedWindow: window,
      };
    }
  }

  return {
    isPeakHour: false,
    timeZone: MOBILITY_PEAK_TIME_ZONE,
    localDayOfWeek,
    localTime,
    matchedWindow: null,
  };
}

/** Parse version-controlled JSON from the server environment. */
export function parseMobilityPeakWindows(
  raw: string | undefined,
): MobilityPeakWindow[] {
  if (!raw?.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("MOBILITY_PEAK_WINDOWS must contain valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("MOBILITY_PEAK_WINDOWS must be a JSON array.");
  }

  parsed.forEach(validateWindow);
  return parsed;
}

function validateWindow(value: unknown): asserts value is MobilityPeakWindow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Peak window must be an object.");
  }

  const window = value as Record<string, unknown>;
  if (!Number.isInteger(window.dayOfWeek) || Number(window.dayOfWeek) < 0 || Number(window.dayOfWeek) > 6) {
    throw new Error("Peak window dayOfWeek must be an integer from 0 to 6.");
  }

  if (typeof window.start !== "string" || typeof window.end !== "string") {
    throw new Error("Peak window start and end must be HH:mm strings.");
  }

  parseMinutes(window.start);
  parseMinutes(window.end);
}

function parseMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Peak window time must use 24-hour HH:mm format.");
  }

  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
