import assert from "node:assert/strict";
import { passwordService } from "../../../src/core/authentication/password.service";
import { AuthConfig } from "../../../src/core/authentication/auth.config";

const validPassword = "MARKA-Secure-Password-2026";

async function runPasswordServiceTests(): Promise<void> {
  assert.equal(passwordService.validatePassword(validPassword), undefined);

  assert.throws(
    () => passwordService.validatePassword("short"),
    /at least 12 characters/i,
  );

  assert.throws(
    () => passwordService.validatePassword("A".repeat(AuthConfig.password.maximumLength + 1)),
    /must not exceed 128 characters/i,
  );

  const hash = await passwordService.hash(validPassword);
  assert.notEqual(hash, validPassword);
  assert.equal(await passwordService.compare(validPassword, hash), true);
  assert.equal(await passwordService.compare("Different-Password-2026", hash), false);
  assert.equal(await passwordService.compare("", hash), false);
  assert.equal(await passwordService.compare(validPassword, ""), false);
}

runPasswordServiceTests()
  .then(() => {
    console.log("Password service tests passed.");
  })
  .catch((error: unknown) => {
    console.error("Password service tests failed.");
    console.error(error);
    process.exitCode = 1;
  });
