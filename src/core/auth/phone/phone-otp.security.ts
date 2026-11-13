import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

const OTP_DIGITS = 6;

function getOtpPepper(): string {
  const pepper = process.env.PHONE_OTP_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("PHONE_OTP_PEPPER must contain at least 32 characters.");
  }
  return pepper;
}

export function generatePhoneOtp(): string {
  return randomInt(0, 10 ** OTP_DIGITS)
    .toString()
    .padStart(OTP_DIGITS, "0");
}

export function hashPhoneOtp(challengeId: string, code: string): string {
  if (!/^\d{6}$/.test(code)) {
    throw new Error("OTP must contain exactly six digits.");
  }

  return createHmac("sha256", getOtpPepper())
    .update(challengeId)
    .update(":")
    .update(code)
    .digest("hex");
}

export function verifyPhoneOtp(
  challengeId: string,
  code: string,
  expectedHash: string
): boolean {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false;
  }

  const actual = Buffer.from(hashPhoneOtp(challengeId, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
