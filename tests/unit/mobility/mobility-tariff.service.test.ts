import assert from "node:assert/strict";
import { quoteMobilityFare } from "../../../src/services/mobility/pricing/mobility-tariff.service";

const names = [
  "MARKA_MOBILITY_TAXI_BASE_FARE_MINOR",
  "MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM",
  "MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE",
  "MARKA_MOBILITY_TAXI_BOOKING_FEE_MINOR",
  "MARKA_MOBILITY_TAXI_MINIMUM_FARE_MINOR",
] as const;
const previous = new Map(names.map((name) => [name, process.env[name]]));

try {
  for (const name of names) delete process.env[name];
  assert.equal(quoteMobilityFare("TAXI", 1000, 60), null);

  process.env.MARKA_MOBILITY_TAXI_BASE_FARE_MINOR = "100000";
  process.env.MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM = "10000";
  process.env.MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE = "5000";
  process.env.MARKA_MOBILITY_TAXI_BOOKING_FEE_MINOR = "5000";
  process.env.MARKA_MOBILITY_TAXI_MINIMUM_FARE_MINOR = "120000";

  const quote = quoteMobilityFare("TAXI", 1000, 60);
  assert.ok(quote);
  assert.equal(quote.totalMinor, BigInt(120000));
  assert.equal(quote.totalAOA, 1200);
  assert.equal(quote.currency, "AOA");
} finally {
  for (const name of names) {
    const value = previous.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

console.log("Mobility tariff quote tests passed.");
