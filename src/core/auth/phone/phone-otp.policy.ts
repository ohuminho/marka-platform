function positiveInteger(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${key} must be a positive integer.`);
  return value;
}

export const PhoneOtpPolicy = Object.freeze({
  codeDigits: 6,
  codeTtlSeconds: 10 * 60,
  resendCooldownSeconds: 2 * 60,
  maxResendsPerChallenge: 2,
  maxAttemptsPerChallenge: 5,
  maxSendsPerPhonePerHour: positiveInteger("PHONE_OTP_MAX_SENDS_PER_PHONE_PER_HOUR", 3),
  maxSendsPerIpPerHour: positiveInteger("PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR", 10),
  monthlyBudgetAoa: positiveInteger("PHONE_OTP_MONTHLY_BUDGET_AOA", 15000),
  estimatedSmsUnitCostAoa: 10.9,
  budgetAlertPercentages: [50, 75, 90, 100] as const,
});
