import assert from "node:assert/strict";
import { generatePhoneOtp, hashPhoneOtp, verifyPhoneOtp } from "../../../src/core/auth/phone/phone-otp.security";
import { normalizePhoneE164 } from "../../../src/core/auth/phone/phone-number";
import { PhoneOtpPolicy } from "../../../src/core/auth/phone/phone-otp.policy";

process.env.PHONE_OTP_PEPPER = "test-only-pepper-with-at-least-32-characters";

const code = generatePhoneOtp();
assert.match(code, /^\d{6}$/);
const hash = hashPhoneOtp("challenge-test-1", code);
assert.equal(verifyPhoneOtp("challenge-test-1", code, hash), true);
assert.equal(verifyPhoneOtp("challenge-test-2", code, hash), false);
assert.equal(verifyPhoneOtp("challenge-test-1", "000000", hash), false);
assert.equal(normalizePhoneE164("+244 923 456 789"), "+244923456789");
assert.throws(() => normalizePhoneE164("923456789"));
assert.equal(PhoneOtpPolicy.codeTtlSeconds, 600);
assert.equal(PhoneOtpPolicy.resendCooldownSeconds, 120);
assert.equal(PhoneOtpPolicy.maxResendsPerChallenge, 2);
assert.equal(PhoneOtpPolicy.maxAttemptsPerChallenge, 5);
assert.equal(PhoneOtpPolicy.maxSendsPerPhonePerHour, 3);
assert.equal(PhoneOtpPolicy.maxSendsPerIpPerHour, 10);

console.log("MARKA OTP Core policy, E.164 and cryptographic tests passed.");
