import assert from "node:assert/strict";
import {
  canAcceptAdditionalFreightAssignment,
  canAcceptFreightAlongsideActiveAssignments,
  shouldReleaseFreightProvider,
} from "../../../src/freight-engine/freight-provider-availability";

assert.equal(canAcceptAdditionalFreightAssignment("AVAILABLE"), true);
assert.equal(canAcceptAdditionalFreightAssignment("BUSY"), true);
assert.equal(canAcceptAdditionalFreightAssignment("OFFLINE"), false);
assert.equal(canAcceptAdditionalFreightAssignment("PAUSED"), false);

assert.equal(shouldReleaseFreightProvider(0), true);
assert.equal(shouldReleaseFreightProvider(1), false);
assert.equal(shouldReleaseFreightProvider(3), false);
assert.equal(shouldReleaseFreightProvider(-1), false);
assert.equal(shouldReleaseFreightProvider(0.5), false);

const tanker = {
  id: "tanker-1",
  kind: "WATER_TANKER",
  capacity: 5000,
  capacityUnit: "LITRE",
  waterType: "POTABLE_WATER",
};
const activeWater = {
  requestType: "WATER_DELIVERY",
  assignedVehicleId: "tanker-1",
  quantity: 1500,
  quantityUnit: "LITRE",
  destinationLatitude: -8.8389,
  destinationLongitude: 13.2894,
  details: { waterType: "POTABLE_WATER" },
};
const candidateWater = {
  requestType: "WATER_DELIVERY",
  assignedVehicleId: "tanker-1",
  quantity: 3000,
  quantityUnit: "LITRE",
  destinationLatitude: -8.85,
  destinationLongitude: 13.29,
  details: { waterType: "POTABLE_WATER" },
};

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeWater],
  candidate: candidateWater,
  vehicle: tanker,
}), true);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [{ ...activeWater, quantity: 2500 }],
  candidate: candidateWater,
  vehicle: tanker,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeWater],
  candidate: { ...candidateWater, assignedVehicleId: "other-tanker" },
  vehicle: tanker,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeWater],
  candidate: { ...candidateWater, destinationLatitude: -8.95 },
  vehicle: tanker,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeWater],
  candidate: { ...candidateWater, requestType: "CARGO_SHIPMENT" },
  vehicle: tanker,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [{ ...activeWater, requestType: "CARGO_SHIPMENT" }],
  candidate: candidateWater,
  vehicle: tanker,
}), false);

const truck = {
  id: "truck-1",
  kind: "LIGHT_TRUCK",
  capacity: 5,
  capacityUnit: "TON",
  waterType: null,
};
const activeCargo = {
  requestType: "CARGO_SHIPMENT",
  assignedVehicleId: "truck-1",
  quantity: 2,
  quantityUnit: "TON",
  destinationLatitude: -8.8389,
  destinationLongitude: 13.2894,
  details: { cargoItems: [{ description: "Cimento" }] },
};
const candidateCargo = {
  requestType: "CARGO_SHIPMENT",
  assignedVehicleId: "truck-1",
  quantity: 2500,
  quantityUnit: "KG",
  destinationLatitude: -8.85,
  destinationLongitude: 13.29,
  details: { cargoItems: [{ description: "Blocos" }] },
};

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeCargo],
  candidate: candidateCargo,
  vehicle: truck,
}), true);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeCargo],
  candidate: { ...candidateCargo, quantity: 3500 },
  vehicle: truck,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [{ ...activeCargo, quantity: null }],
  candidate: candidateCargo,
  vehicle: truck,
}), false);

assert.equal(canAcceptFreightAlongsideActiveAssignments({
  activeAssignments: [activeCargo],
  candidate: { ...candidateCargo, quantityUnit: "M3" },
  vehicle: truck,
}), false);

console.log("Freight provider assignment and capacity rules passed.");
