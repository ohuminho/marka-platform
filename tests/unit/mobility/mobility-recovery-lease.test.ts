import assert from "node:assert/strict";

import {
  createMobilityDispatchRecoveryLease,
  isMobilityDispatchRecoveryLeaseActive,
  shouldHoldMobilityDispatchLease,
  MOBILITY_DISPATCH_RECOVERY_LEASE_MS,
} from "../../../src/services/mobility/orchestration/mobility-recovery-lease";

const now = new Date("2026-11-20T06:00:00.000Z");
const lease = createMobilityDispatchRecoveryLease(now);

assert.equal(
  lease.getTime() - now.getTime(),
  MOBILITY_DISPATCH_RECOVERY_LEASE_MS,
  "A new dispatch recovery lease must use the configured duration.",
);

assert.equal(
  isMobilityDispatchRecoveryLeaseActive(null, now.getTime()),
  false,
  "A missing lease must not block recovery.",
);

assert.equal(
  isMobilityDispatchRecoveryLeaseActive(
    new Date(now.getTime() - 1),
    now.getTime(),
  ),
  false,
  "An expired lease must allow recovery.",
);

assert.equal(
  isMobilityDispatchRecoveryLeaseActive(lease, lease.getTime() - 1),
  true,
  "A lease must block recovery until its exact expiry.",
);

assert.equal(
  isMobilityDispatchRecoveryLeaseActive(lease, lease.getTime()),
  false,
  "Recovery must be allowed at the lease expiry boundary.",
);

assert.equal(
  isMobilityDispatchRecoveryLeaseActive(
    new Date(lease.getTime() + 1),
    lease.getTime(),
  ),
  true,
  "A future lease must block concurrent recovery.",
);


assert.equal(
  shouldHoldMobilityDispatchLease("RECOVERY_REQUIRED", "RECOVERY_REQUIRED"),
  false,
  "A recovery-required ride must be eligible for an immediate recovery attempt.",
);

assert.equal(
  shouldHoldMobilityDispatchLease("SEARCHING", "ACTIVE"),
  true,
  "The lease must protect an active dispatch attempt.",
);

assert.equal(
  shouldHoldMobilityDispatchLease("DRIVER_ASSIGNED", "ACTIVE"),
  false,
  "A completed driver assignment must not retain a dispatch lease.",
);

console.log("Mobility dispatch recovery lease tests passed.");
