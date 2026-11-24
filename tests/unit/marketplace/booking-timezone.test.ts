import assert from "node:assert/strict";
import { weekdayInTimeZone } from "../../../src/frontend/features/marketplace/utils/booking-time";

const instant = new Date("2026-11-17T00:30:00.000Z");

// The same instant is Tuesday in Luanda but still Monday in Los Angeles.
// The booking panel must use the space timezone, exactly as the API does.
assert.equal(weekdayInTimeZone(instant, "Africa/Luanda"), 2);
assert.equal(weekdayInTimeZone(instant, "America/Los_Angeles"), 1);

console.log("Space booking timezone tests passed.");
