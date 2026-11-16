import { MobilityRideStatus } from "@prisma/client";

import {
  canTransitionRideStatus,
  transitionRideStatus,
} from "@/services/mobility/rides/mobility-ride.state-machine";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(
  callback: () => unknown,
  expectedCode: string,
  message: string
): void {
  try {
    callback();
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;

    assert(
      code === expectedCode,
      `${message} (expected ${expectedCode}, received ${code ?? "unknown"})`
    );
    return;
  }

  throw new Error(`Assertion failed: ${message} (expected an error)`);
}

assert(
  canTransitionRideStatus(
    MobilityRideStatus.DRIVER_ASSIGNED,
    MobilityRideStatus.SEARCHING
  ),
  "A rejected assigned driver must return the ride to searching."
);

assert(
  canTransitionRideStatus(
    MobilityRideStatus.DRIVER_ARRIVING,
    MobilityRideStatus.SEARCHING
  ),
  "A rejected arriving driver must return the ride to searching."
);

assert(
  !canTransitionRideStatus(
    MobilityRideStatus.TRIP_IN_PROGRESS,
    MobilityRideStatus.SEARCHING
  ),
  "A ride in progress must never be redispatched."
);

assert(
  transitionRideStatus(
    MobilityRideStatus.DRIVER_ARRIVING,
    MobilityRideStatus.SEARCHING
  ) === MobilityRideStatus.SEARCHING,
  "Returning a rejected arriving driver to searching must preserve the target status."
);

assertThrows(
  () =>
    transitionRideStatus(
      MobilityRideStatus.TRIP_IN_PROGRESS,
      MobilityRideStatus.SEARCHING
    ),
  "INVALID_RIDE_STATUS_TRANSITION",
  "An active trip cannot be redispatched."
);


const driverLifecycle = [
  MobilityRideStatus.DRIVER_ASSIGNED,
  MobilityRideStatus.DRIVER_ARRIVING,
  MobilityRideStatus.DRIVER_ARRIVED,
  MobilityRideStatus.TRIP_STARTED,
  MobilityRideStatus.TRIP_IN_PROGRESS,
  MobilityRideStatus.TRIP_COMPLETED,
] as const;

for (let index = 0; index < driverLifecycle.length - 1; index += 1) {
  assert(
    canTransitionRideStatus(driverLifecycle[index], driverLifecycle[index + 1]),
    `Driver lifecycle must allow ${driverLifecycle[index]} -> ${driverLifecycle[index + 1]}.`,
  );
}

assert(
  !canTransitionRideStatus(
    MobilityRideStatus.DRIVER_ASSIGNED,
    MobilityRideStatus.DRIVER_ARRIVED,
  ),
  "A driver cannot skip the arrival transition after accepting an assignment.",
);

assert(
  !canTransitionRideStatus(
    MobilityRideStatus.DRIVER_ASSIGNED,
    MobilityRideStatus.TRIP_STARTED,
  ),
  "A driver cannot start a trip before confirming arrival.",
);

assert(
  !canTransitionRideStatus(
    MobilityRideStatus.TRIP_COMPLETED,
    MobilityRideStatus.DRIVER_ASSIGNED,
  ),
  "A completed ride cannot be assigned again.",
);

console.log("Mobility ride state machine tests passed.");
