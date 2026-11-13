import assert from "node:assert/strict";

import { normalizePhoneE164 } from "../../../../src/core/auth/phone/phone-number";
import { resolveLoginIdentifier } from "../../../../src/core/auth/phone/login-identifier";
import { getPhoneOtpRateLimitLockKeys } from "../../../../src/core/auth/phone/phone-otp.locks";
import {
  generatePhoneOtp,
  hashPhoneOtp,
  verifyPhoneOtp,
} from "../../../../src/core/auth/phone/phone-otp.security";

process.env.PHONE_OTP_PEPPER = "unit-test-pepper-value-at-least-32-characters";

const code = generatePhoneOtp();
assert.match(code, /^\d{6}$/);

const challengeId = "phone-otp-unit-test";
const hash = hashPhoneOtp(challengeId, code);
assert.equal(verifyPhoneOtp(challengeId, code, hash), true);
assert.equal(verifyPhoneOtp("different-challenge", code, hash), false);
assert.equal(verifyPhoneOtp(challengeId, "12345", hash), false);
assert.equal(verifyPhoneOtp(challengeId, code, "invalid-hash"), false);

assert.equal(
  normalizePhoneE164("+244 923 456 789"),
  "+244923456789"
);
assert.equal(
  normalizePhoneE164("+1 (202) 555-0100"),
  "+12025550100"
);
assert.throws(() => normalizePhoneE164("923456789"), /E.164/);
assert.throws(() => normalizePhoneE164("+0123456789"), /E.164/);

assert.deepEqual(resolveLoginIdentifier(" USER@Example.COM "), {
  kind: "email",
  value: "user@example.com",
});
assert.deepEqual(resolveLoginIdentifier("+244 923 456 789"), {
  kind: "phone",
  value: "+244923456789",
});
assert.equal(resolveLoginIdentifier("+244 123"), null);
assert.equal(resolveLoginIdentifier("not-an-email"), null);
assert.equal(resolveLoginIdentifier(null), null);

const phoneLockOnly = getPhoneOtpRateLimitLockKeys("+244923456789");
assert.deepEqual(phoneLockOnly, ["marka:phone-otp:phone:+244923456789"]);

const scopedLocks = getPhoneOtpRateLimitLockKeys(
  "+244923456789",
  "a".repeat(64),
);
assert.equal(scopedLocks.length, 2);
assert.deepEqual(scopedLocks, [...scopedLocks].sort());
assert.deepEqual(
  getPhoneOtpRateLimitLockKeys("+244923456789", "a".repeat(64)),
  scopedLocks,
);
assert.notDeepEqual(
  getPhoneOtpRateLimitLockKeys("+244923456789", "b".repeat(64)),
  scopedLocks,
);

console.log("MARKA phone OTP core unit tests passed.");
