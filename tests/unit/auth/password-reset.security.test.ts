import assert from "node:assert/strict";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "../../../src/core/authentication/password-reset.security";

assert.equal(PASSWORD_RESET_TOKEN_TTL_MS, 30 * 60 * 1000);

const first = generatePasswordResetToken();
const second = generatePasswordResetToken();
assert.match(first, /^[A-Za-z0-9_-]{43}$/);
assert.notEqual(first, second, "reset tokens must be generated independently");

const hash = hashPasswordResetToken(first);
assert.match(hash, /^[a-f0-9]{64}$/);
assert.notEqual(hash, first, "the stored token representation must not be the raw token");
assert.equal(hashPasswordResetToken(first), hash, "token hashing must be deterministic");

const now = new Date("2026-11-17T10:00:00.000Z");
assert.equal(isPasswordResetTokenUsable({ expiresAt: new Date(now.getTime() + 1), usedAt: null }, now), true);
assert.equal(isPasswordResetTokenUsable({ expiresAt: now, usedAt: null }, now), false);
assert.equal(isPasswordResetTokenUsable({ expiresAt: new Date(now.getTime() + 1), usedAt: now }, now), false);

console.log("Password reset token security tests passed.");
