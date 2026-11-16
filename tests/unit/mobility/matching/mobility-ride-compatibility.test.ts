import assert from "node:assert/strict";
import { MobilityRideStatus } from "@prisma/client";

import {
  areMobilityRidesCompatible,
  MAX_ACTIVE_RIDES_PER_DRIVER,
} from "@/services/mobility/matching/mobility-ride-compatibility";

const ride = (
  pickupLatitude: number,
  pickupLongitude: number,
  dropoffLatitude: number,
  dropoffLongitude: number,
  status: MobilityRideStatus = MobilityRideStatus.DRIVER_ASSIGNED,
  passengerCount = 1,
) => ({
  pickupLatitude,
  pickupLongitude,
  dropoffLatitude,
  dropoffLongitude,
  serviceType: "TAXI",
  status,
  metadata: { passengerCount },
});

const current = ride(-8.8383, 13.2344, -8.815, 13.245, MobilityRideStatus.SEARCHING);
const nearby = ride(-8.839, 13.235, -8.816, 13.246);

assert.equal(
  areMobilityRidesCompatible(current, [nearby], 4),
  true,
  "Nearby trips with similar endpoints and available passenger capacity may share a driver.",
);

assert.equal(
  areMobilityRidesCompatible(
    current,
    [ride(-8.80, 13.30, -8.77, 13.35)],
    4,
  ),
  false,
  "Trips with distant pickup/dropoff points must not be grouped.",
);

assert.equal(
  areMobilityRidesCompatible(
    current,
    [ride(-8.839, 13.235, -8.816, 13.246, MobilityRideStatus.TRIP_IN_PROGRESS)],
    4,
  ),
  false,
  "A driver already carrying a passenger cannot accept another trip.",
);

assert.equal(
  areMobilityRidesCompatible(
    ride(-8.8383, 13.2344, -8.815, 13.245, MobilityRideStatus.SEARCHING, 3),
    [nearby],
    4,
  ),
  true,
  "Combined passenger count may not exceed the registered vehicle capacity.",
);

assert.equal(
  areMobilityRidesCompatible(
    ride(-8.8383, 13.2344, -8.815, 13.245, MobilityRideStatus.SEARCHING, 4),
    [nearby],
    4,
  ),
  false,
  "Assignments exceeding vehicle capacity must be rejected.",
);

assert.equal(
  areMobilityRidesCompatible(current, [nearby, nearby], 8),
  false,
  `A driver may hold at most ${MAX_ACTIVE_RIDES_PER_DRIVER} active rides.`,
);

assert.equal(
  areMobilityRidesCompatible(
    current,
    [{ ...nearby, serviceType: "MOTO_TAXI" }],
    4,
  ),
  false,
  "Different mobility service classes must not be combined.",
);

console.log("Mobility shared-ride compatibility tests passed.");
