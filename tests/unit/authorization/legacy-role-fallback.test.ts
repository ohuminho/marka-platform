import assert from "node:assert/strict";
import { getLegacyPrivilegedRoleName } from "../../../src/core/authorization/authorization.service";

assert.equal(getLegacyPrivilegedRoleName("SUPER_ADMIN"), "SUPER_ADMIN");
assert.equal(getLegacyPrivilegedRoleName("ADMIN"), "ADMIN");
assert.equal(getLegacyPrivilegedRoleName("CUSTOMER"), null);
assert.equal(getLegacyPrivilegedRoleName("DRIVER"), null);
assert.equal(getLegacyPrivilegedRoleName(undefined), null);

console.log("Legacy authorization role fallback tests passed.");
