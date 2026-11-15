function positiveIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export const PhoneOtpPolicy = Object.freeze({
  codeDigits: 6,
  codeTtlSeconds: 300,
  resendCooldownSeconds: 60,
  maxAttemptsPerChallenge: 5,
  maxSendsPerPhonePerHour: positiveIntegerFromEnv(
    "PHONE_OTP_MAX_SENDS_PER_PHONE_PER_HOUR",
    5
  ),
  maxSendsPerIpPerHour: positiveIntegerFromEnv(
    "PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR",
    10
  ),
  monthlyBudgetAoa: positiveIntegerFromEnv(
    "PHONE_OTP_MONTHLY_BUDGET_AOA",
    15_000
  ),
  budgetAlertPercentages: [50, 75, 90, 100] as const,
});
