import assert from "node:assert/strict";

import {
  buildMobilityRideRequestHash,
  type CreateMobilityRideInput,
} from "../../../src/services/mobility/rides/mobility-ride.service";

const original: CreateMobilityRideInput = {
  organizationId: "org-test",
  riderId: "rider-test",
  serviceType: "TAXI",
  currency: "AOA",
  estimatedFareMinor: BigInt(500_000),
  pickupLatitude: -8.8383,
  pickupLongitude: 13.2344,
  pickupAddress: "Origem",
  dropoffLatitude: -8.9000,
  dropoffLongitude: 13.2500,
  dropoffAddress: "Destino",
  metadata: {
    passengerCount: 2,
    safetyMode: "STANDARD",
    pricingSnapshot: {
      source: "MARKA_SERVER_TARIFF",
      distanceMeters: 12_000,
      durationSeconds: 1_800,
      totalMinor: "500000",
    },
  },
};

const recalculatedQuote: CreateMobilityRideInput = {
  ...original,
  estimatedFareMinor: BigInt(501_250),
  metadata: {
    passengerCount: 2,
    safetyMode: "STANDARD",
    pricingSnapshot: {
      source: "MARKA_SERVER_TARIFF",
      distanceMeters: 12_025,
      durationSeconds: 1_810,
      totalMinor: "501250",
    },
  },
};

assert.equal(
  buildMobilityRideRequestHash(original),
  buildMobilityRideRequestHash(recalculatedQuote),
  "Server-recalculated fare and route snapshot must not invalidate a retry.",
);

assert.notEqual(
  buildMobilityRideRequestHash(original),
  buildMobilityRideRequestHash({
    ...original,
    dropoffLatitude: -8.901,
  }),
  "A materially different destination must still produce a different request identity.",
);

assert.notEqual(
  buildMobilityRideRequestHash(original),
  buildMobilityRideRequestHash({
    ...original,
    metadata: {
      passengerCount: 1,
      safetyMode: "STANDARD",
      pricingSnapshot: {
        source: "MARKA_SERVER_TARIFF",
        distanceMeters: 12_000,
        durationSeconds: 1_800,
        totalMinor: "500000",
      },
    },
  }),
  "Passenger count must remain part of the request identity.",
);

console.log("Mobility ride idempotency hash tests passed.");
