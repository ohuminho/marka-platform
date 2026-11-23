import assert from "node:assert/strict";
import { isFreightPostCompletionStatus } from "../../../src/freight-engine/freight-exception-resolution";

assert.equal(isFreightPostCompletionStatus("PROVIDER_COMPLETED_PENDING_CONFIRMATION"), true);
assert.equal(isFreightPostCompletionStatus("ASSIGNED"), false);
assert.equal(isFreightPostCompletionStatus("PROVIDER_EN_ROUTE"), false);
assert.equal(isFreightPostCompletionStatus("PROVIDER_ARRIVED"), false);
assert.equal(isFreightPostCompletionStatus("PICKED_UP"), false);
assert.equal(isFreightPostCompletionStatus("IN_TRANSIT"), false);
assert.equal(isFreightPostCompletionStatus("EXCEPTION"), false);
assert.equal(isFreightPostCompletionStatus("COMPLETED"), false);

console.log("Freight post-completion exception rules passed.");
