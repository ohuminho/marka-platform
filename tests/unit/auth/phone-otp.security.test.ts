import assert from "node:assert/strict";

process.env.PHONE_OTP_PEPPER = "unit-test-pepper-value-at-least-32-chars";

const {
  generatePhoneOtp,
  hashPhoneOtp,
  verifyPhoneOtp,
} = await import("../../../src/core/auth/phone/phone-otp.security");
const { normalizePhoneE164 } = await import(
  "../../../src/core/auth/phone/phone-number"
);
const { MimoVerifySmsProvider } = await import(
  "../../../src/core/auth/phone/mimo-verify-sms.provider"
);

{
  const code = generatePhoneOtp();
  assert.match(code, /^\d{6}$/);

  const challengeId = "challenge-unit-test";
  const hash = hashPhoneOtp(challengeId, code);

  assert.equal(verifyPhoneOtp(challengeId, code, hash), true);
  assert.equal(verifyPhoneOtp("another-challenge", code, hash), false);
  assert.equal(verifyPhoneOtp(challengeId, "000000", "invalid"), false);
  assert.equal(verifyPhoneOtp(challengeId, "12345", hash), false);
}

{
  assert.equal(normalizePhoneE164("+244 923 456 789"), "+244923456789");
  assert.equal(normalizePhoneE164("+1 (202) 555-0100"), "+12025550100");
  assert.throws(() => normalizePhoneE164("923456789"), /E.164/);
  assert.throws(() => normalizePhoneE164("+0123456789"), /E.164/);
  assert.throws(() => normalizePhoneE164("+123"), /E.164/);
}

{
  const names = [
    "MIMO_VERIFY_API_KEY",
    "MIMO_VERIFY_AUTH_HEADER_NAME",
    "MIMO_VERIFY_AUTH_HEADER_VALUE",
  ];
  const previous = new Map(names.map((name) => [name, process.env[name]]));

  for (const name of names) delete process.env[name];

  await assert.rejects(
    () =>
      new MimoVerifySmsProvider().send({
        recipientE164: "+244923456789",
        code: "123456",
        expiresInSeconds: 300,
        idempotencyKey: "unit-test-key",
      }),
    /not configured/
  );

  for (const name of names) {
    const value = previous.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

console.log("Phone OTP foundation tests passed.");
