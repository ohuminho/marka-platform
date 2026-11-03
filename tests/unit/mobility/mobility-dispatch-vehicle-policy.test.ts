import assert from "node:assert/strict";

import { resolveServiceVehicleTypes } from "../../../src/dispatch-engine/mobility-dispatch.service";

assert.deepEqual(resolveServiceVehicleTypes("TAXI"), ["CAR"]);
assert.deepEqual(resolveServiceVehicleTypes("MOTO_TAXI"), ["MOTORCYCLE"]);
assert.deepEqual(resolveServiceVehicleTypes("VAN"), ["VAN"]);
assert.deepEqual(resolveServiceVehicleTypes("MINIBUS"), ["MINIBUS"]);
assert.deepEqual(resolveServiceVehicleTypes("BUS"), ["BUS"]);
assert.deepEqual(resolveServiceVehicleTypes("COACH"), ["COACH"]);

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
