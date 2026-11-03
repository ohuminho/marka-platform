import assert from "node:assert/strict";

import {
  evaluateMobilityPeakPeriod,
  parseMobilityPeakWindows,
} from "../../../src/services/mobility/pricing/mobility-peak-period.service";

// 07:30 UTC = 08:30 in Luanda on Tuesday, 3 November 2026.
const peak = evaluateMobilityPeakPeriod(
  new Date("2026-11-03T07:30:00.000Z"),
  [{ dayOfWeek: 2, start: "07:00", end: "09:00" }],
);
assert.equal(peak.isPeakHour, true);
assert.equal(peak.localDayOfWeek, 2);
assert.equal(peak.localTime, "08:30");
assert.equal(peak.timeZone, "Africa/Luanda");

// End boundary is exclusive.
const endBoundary = evaluateMobilityPeakPeriod(
  new Date("2026-11-03T08:00:00.000Z"),
  [{ dayOfWeek: 2, start: "07:00", end: "09:00" }],
);
assert.equal(endBoundary.isPeakHour, false);

// A Monday overnight window remains active after midnight on Tuesday.
const overnight = evaluateMobilityPeakPeriod(
  new Date("2026-11-03T00:00:00.000Z"),
  [{ dayOfWeek: 1, start: "22:00", end: "02:00" }],
);
assert.equal(overnight.isPeakHour, true);
assert.equal(overnight.localTime, "01:00");

// No configured windows means no promotion eligibility from peak time.
assert.equal(
  evaluateMobilityPeakPeriod(new Date("2026-11-03T07:30:00.000Z"), []).isPeakHour,
  false,
);

assert.deepEqual(
  parseMobilityPeakWindows('[{"dayOfWeek":2,"start":"07:00","end":"09:00"}]'),
  [{ dayOfWeek: 2, start: "07:00", end: "09:00" }],
);
assert.deepEqual(parseMobilityPeakWindows(undefined), []);
assert.throws(() => parseMobilityPeakWindows("{invalid"), /valid JSON/);
assert.throws(
  () => parseMobilityPeakWindows('[{"dayOfWeek":8,"start":"07:00","end":"09:00"}]'),
  /dayOfWeek/,
);
assert.throws(
  () => parseMobilityPeakWindows('[{"dayOfWeek":2,"start":"25:00","end":"09:00"}]'),
  /HH:mm/,
);
assert.throws(
  () => evaluateMobilityPeakPeriod(new Date("invalid"), []),
  /valid date/,
);

console.log("Mobility peak-period policy tests passed.");
