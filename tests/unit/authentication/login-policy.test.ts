import assert from "node:assert/strict";
import { isPrivilegedLoginAccount } from "../../../src/core/authentication/login-policy";

const cases = [
  {
    name: "active founder",
    user: { status: "ACTIVE", role: "CUSTOMER", isFounder: true },
    expected: true,
  },
  {
    name: "active global administrator",
    user: { status: "ACTIVE", role: "ADMIN", isFounder: false },
    expected: true,
  },
  {
    name: "active super administrator",
    user: { status: "ACTIVE", role: "SUPER_ADMIN", isFounder: false },
    expected: true,
  },
  {
    name: "ordinary active customer",
    user: { status: "ACTIVE", role: "CUSTOMER", isFounder: false },
    expected: false,
  },
  {
    name: "suspended founder",
    user: { status: "SUSPENDED", role: "SUPER_ADMIN", isFounder: true },
    expected: false,
  },
  {
    name: "locked administrator",
    user: { status: "LOCKED", role: "ADMIN", isFounder: false },
    expected: false,
  },
  {
    name: "pending founder",
    user: { status: "PENDING_VERIFICATION", role: "SUPER_ADMIN", isFounder: true },
    expected: false,
  },
  {
    name: "missing account",
    user: null,
    expected: false,
  },
];

for (const testCase of cases) {
  assert.equal(
    isPrivilegedLoginAccount(testCase.user),
    testCase.expected,
    testCase.name,
  );
}

console.log("Login privilege policy tests passed.");
