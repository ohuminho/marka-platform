import assert from "node:assert/strict";

import {
  buildDispatchRejectionMetadata,
  readDispatchRejectedDriverIds,
  resolveServiceVehicleTypes,
} from "../../../src/dispatch-engine/mobility-dispatch.service";

assert.deepEqual(resolveServiceVehicleTypes("TAXI"), ["CAR"]);
assert.deepEqual(resolveServiceVehicleTypes("MOTO_TAXI"), ["MOTORCYCLE"]);
assert.deepEqual(resolveServiceVehicleTypes("VAN"), ["VAN"]);
assert.deepEqual(resolveServiceVehicleTypes("MINIBUS"), ["MINIBUS"]);
assert.deepEqual(resolveServiceVehicleTypes("BUS"), ["BUS"]);
assert.deepEqual(resolveServiceVehicleTypes("COACH"), ["COACH"]);
assert.deepEqual(resolveServiceVehicleTypes("PICKUP"), ["TRUCK"]);
assert.deepEqual(resolveServiceVehicleTypes("LIGHT_TRUCK"), ["TRUCK"]);
assert.deepEqual(resolveServiceVehicleTypes("MEDIUM_TRUCK"), ["TRUCK"]);
assert.deepEqual(resolveServiceVehicleTypes("TIPPER_TRUCK"), ["TRUCK"]);
assert.deepEqual(resolveServiceVehicleTypes("HEAVY_TRUCK"), ["TRUCK"]);

// A client may narrow an eligible class, but cannot widen or substitute it.
assert.deepEqual(
  resolveServiceVehicleTypes("TAXI", ["CAR"]),
  ["CAR"],
);
assert.deepEqual(
  resolveServiceVehicleTypes("TAXI", ["CAR", "CAR"]),
  ["CAR"],
);

assert.throws(
  () => resolveServiceVehicleTypes("MOTO_TAXI", ["CAR"]),
  /not permitted for this Mobility service/,
);
assert.throws(
  () => resolveServiceVehicleTypes("TAXI", ["CAR", "MOTORCYCLE"]),
  /not permitted for this Mobility service/,
);
assert.throws(
  () => resolveServiceVehicleTypes("TAXI", []),
  /not permitted for this Mobility service/,
);
assert.throws(
  () => resolveServiceVehicleTypes("UNKNOWN_SERVICE"),
  /Unsupported Mobility service type/,
);

console.log("Mobility dispatch vehicle policy tests passed.");

const originalMetadata = {
  passengerCount: 2,
  safetyMode: "STANDARD",
};
const afterFirstRejection = buildDispatchRejectionMetadata(
  originalMetadata,
  {
    driverId: "driver-a",
    reason: "Vehicle unavailable",
    rejectedAt: new Date("2026-11-17T10:00:00.000Z"),
  },
);
const afterSecondRejection = buildDispatchRejectionMetadata(
  afterFirstRejection as import("@prisma/client").Prisma.JsonValue,
  {
    driverId: "driver-b",
    reason: "Outside service area",
    rejectedAt: new Date("2026-11-17T10:01:00.000Z"),
  },
);
assert.deepEqual(readDispatchRejectedDriverIds(afterSecondRejection), [
  "driver-a",
  "driver-b",
]);
assert.equal((afterSecondRejection as Record<string, unknown>).passengerCount, 2);
assert.equal(
  ((afterSecondRejection as Record<string, unknown>).dispatchRejections as unknown[]).length,
  2,
);
assert.deepEqual(readDispatchRejectedDriverIds(null), []);
assert.deepEqual(readDispatchRejectedDriverIds({ passengerCount: 1 }), []);

