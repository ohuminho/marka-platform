import assert from "node:assert/strict";
import { MobilityRideStatus } from "@prisma/client";

import {
  areMobilityRidesCompatible,
  isSharedRideSequenceWithinDetour,
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

const shortDetourMatrix = [
  [0, 120, 600, 150, 700],
  [120, 0, 300, 90, 420],
  [300, 300, 0, 330, 120],
  [150, 90, 330, 0, 300],
  [700, 420, 120, 300, 0],
];
assert.equal(
  isSharedRideSequenceWithinDetour(shortDetourMatrix),
  true,
  "A shared ride with a short road-network detour should be eligible.",
);

const longDetourMatrix = [
  [0, 120, 300, 2_000, 2_500],
  [120, 0, 300, 1_800, 2_200],
  [300, 300, 0, 1_900, 2_300],
  [2_000, 1_800, 1_900, 0, 300],
  [2_500, 2_200, 2_300, 300, 0],
];
assert.equal(
  isSharedRideSequenceWithinDetour(longDetourMatrix),
  false,
  "A route that adds excessive road-network time must be rejected.",
);
assert.equal(
  isSharedRideSequenceWithinDetour([[0, 10], [10, 0]]),
  false,
  "Incomplete route matrices must fail closed.",
);

const newPickupFirstMatrix = Array.from({ length: 5 }, (_, row) =>
  Array.from({ length: 5 }, (_, column) => row === column ? 0 : 400),
);
newPickupFirstMatrix[0][1] = 100;
newPickupFirstMatrix[1][2] = 100;
newPickupFirstMatrix[0][3] = 100;
newPickupFirstMatrix[3][4] = 100;
newPickupFirstMatrix[4][1] = 50;
newPickupFirstMatrix[2][3] = 500;
newPickupFirstMatrix[4][2] = 500;
assert.equal(
  isSharedRideSequenceWithinDetour(newPickupFirstMatrix),
  true,
  "An efficient route may prioritize the newly requested pickup before the existing driver begins travelling.",
);
assert.equal(
  isSharedRideSequenceWithinDetour(newPickupFirstMatrix, true),
  false,
  "Once the driver is already arriving, the existing pickup must retain priority.",
);

console.log("Mobility shared-ride compatibility tests passed.");
