/**
 * Produces deterministic PostgreSQL advisory-lock keys for OTP rate-limit scopes.
 * Sorting gives every request the same lock acquisition order and prevents
 * deadlocks when requests share either a phone number or an IP address.
 */
export function getPhoneOtpRateLimitLockKeys(
  phoneE164: string,
  ipAddressHash?: string,
): string[] {
  return [
    `marka:phone-otp:phone:${phoneE164}`,
    ...(ipAddressHash ? [`marka:phone-otp:ip:${ipAddressHash}`] : []),
  ].sort();
}
