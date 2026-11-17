import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";

import {
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

const rejectedEvents: Array<{ metadata: Prisma.JsonValue | null }> = [
  {
    metadata: {
      result: {
        result: { rejectedDriverId: "driver-a" },
        reason: "Vehicle unavailable",
      },
    },
  },
  {
    metadata: {
      result: {
        rejectedDriverId: "driver-b",
        reason: "Outside service area",
      },
    },
  },
  {
    metadata: {
      rejectedDriverId: "driver-a",
    },
  },
  { metadata: null },
];
assert.deepEqual(readDispatchRejectedDriverIds(rejectedEvents), [
  "driver-a",
  "driver-b",
]);

assert.deepEqual(
  readDispatchRejectedDriverIds([
    {
      metadata: {
        result: { rejectedDriverId: "driver-current" },
      },
    },
    {
      metadata: {
        result: {
          result: { rejectedDriverId: "driver-legacy" },
        },
      },
    },
  ]),
  ["driver-current", "driver-legacy"],
);
assert.deepEqual(readDispatchRejectedDriverIds([]), []);

console.log("Mobility rejection exclusion tests passed.");
