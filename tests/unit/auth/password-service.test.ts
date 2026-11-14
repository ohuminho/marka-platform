import assert from "node:assert/strict";

import { PasswordService } from "../../../src/core/authentication/password.service";
import { AuthConfig } from "../../../src/core/authentication/auth.config";

const service = new PasswordService();
const existingEmailAccountPassword = "Existing-MarkA-Password-2026";

assert.equal(
  existingEmailAccountPassword.length >= AuthConfig.password.minimumLength,
  true,
  "Regression fixture must satisfy the existing password policy",
);

const hash = await service.hash(existingEmailAccountPassword);
assert.notEqual(hash, existingEmailAccountPassword);
assert.equal(await service.compare(existingEmailAccountPassword, hash), true);
assert.equal(await service.compare("different-password-value", hash), false);
assert.equal(await service.compare("", hash), false);
assert.equal(await service.compare(existingEmailAccountPassword, ""), false);

assert.throws(
  () => service.validatePassword("too-short"),
  /at least 12 characters/,
);
assert.throws(
  () => service.validatePassword("x".repeat(AuthConfig.password.maximumLength + 1)),
  /must not exceed 128 characters/,
);
assert.doesNotThrow(
  () => service.validatePassword("x".repeat(AuthConfig.password.minimumLength)),
);
assert.doesNotThrow(
  () => service.validatePassword("x".repeat(AuthConfig.password.maximumLength)),
);

console.log("MARKA password compatibility unit tests passed.");
