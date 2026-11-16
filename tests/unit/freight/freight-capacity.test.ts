import assert from "node:assert/strict";
import { canVehicleCarryCombinedQuantities, canVehicleCarryQuantity } from "../../../src/freight-engine/freight-capacity";

assert.equal(canVehicleCarryQuantity(2, "TON", 1500, "KG"), true);
assert.equal(canVehicleCarryQuantity(1.5, "TON", 1500, "KG"), true);
assert.equal(canVehicleCarryQuantity(1, "TON", 1501, "KG"), false);
assert.equal(canVehicleCarryQuantity(2500, "LITRE", 2, "M3"), true);
assert.equal(canVehicleCarryQuantity(1.5, "M3", 1600, "LITRE"), false);
assert.equal(canVehicleCarryQuantity(2, "TON", 1, "M3"), false);
assert.equal(canVehicleCarryQuantity(null, "KG", 10, "KG"), false);
assert.equal(canVehicleCarryQuantity(0, "KG", 10, "KG"), false);
assert.equal(canVehicleCarryQuantity(10, "UNKNOWN", 5, "KG"), false);

console.log("freight capacity checks passed");

assert.equal(canVehicleCarryCombinedQuantities(2, "TON", [
  { quantity: 750, unit: "KG" },
  { quantity: 1.25, unit: "TON" },
]), true);
assert.equal(canVehicleCarryCombinedQuantities(2, "TON", [
  { quantity: 750, unit: "KG" },
  { quantity: 1.3, unit: "TON" },
]), false);
assert.equal(canVehicleCarryCombinedQuantities(2500, "LITRE", [
  { quantity: 1, unit: "M3" },
  { quantity: 500, unit: "LITRE" },
]), true);
assert.equal(canVehicleCarryCombinedQuantities(2, "TON", [
  { quantity: 1, unit: "M3" },
]), false);
assert.equal(canVehicleCarryCombinedQuantities(2, "TON", []), false);
