import assert from "node:assert/strict";
import { quoteMobilityFare } from "../../../src/services/mobility/pricing/mobility-tariff.service";

async function main(): Promise<void> {
  const names = [
    "MARKA_MOBILITY_TAXI_BASE_FARE_MINOR",
    "MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM",
    "MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE",
    "MARKA_MOBILITY_TAXI_BOOKING_FEE_MINOR",
    "MARKA_MOBILITY_TAXI_MINIMUM_FARE_MINOR",
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    for (const name of names) delete process.env[name];
    assert.equal(quoteMobilityFare("TAXI", 2_500, 120), null);

    process.env.MARKA_MOBILITY_TAXI_BASE_FARE_MINOR = "50000";
    process.env.MARKA_MOBILITY_TAXI_DISTANCE_RATE_MINOR_PER_KM = "10000";
    process.env.MARKA_MOBILITY_TAXI_DURATION_RATE_MINOR_PER_MINUTE = "1000";

    const quote = quoteMobilityFare("TAXI", 2_500, 120);
    assert.ok(quote);
    assert.equal(quote.currency, "AOA");
    assert.equal(quote.totalMinor, "77000");
    assert.equal(quote.totalAOA, 770);
    assert.equal(quote.distanceMeters, 2_500);
    assert.equal(quote.durationSeconds, 120);

    process.env.MARKA_MOBILITY_TAXI_BOOKING_FEE_MINOR = "5000";
    process.env.MARKA_MOBILITY_TAXI_MINIMUM_FARE_MINOR = "90000";
    const minimumQuote = quoteMobilityFare("TAXI", 2_500, 120);
    assert.equal(minimumQuote?.totalMinor, "90000");
    assert.equal(minimumQuote?.totalAOA, 900);

    process.env.MARKA_MOBILITY_TAXI_BASE_FARE_MINOR = "-1";
    assert.equal(quoteMobilityFare("TAXI", 2_500, 120), null);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  console.log("Mobility tariff tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
