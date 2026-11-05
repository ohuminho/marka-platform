const DEFAULT_MONTHLY_BUDGET_AOA = 15_000;

function readPositiveInteger(
  key: string,
  fallback: number
): number {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

export const PhoneOtpPolicy = Object.freeze({
  codeDigits: 6,
  codeTtlSeconds: 5 * 60,
  resendCooldownSeconds: 60,
  maxAttemptsPerChallenge: 5,
  maxSendsPerPhonePerHour: readPositiveInteger(
    "PHONE_OTP_MAX_SENDS_PER_PHONE_PER_HOUR",
    5
  ),
  maxSendsPerIpPerHour: readPositiveInteger(
    "PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR",
    10
  ),
  monthlyBudgetAoa: readPositiveInteger(
    "PHONE_OTP_MONTHLY_BUDGET_AOA",
    DEFAULT_MONTHLY_BUDGET_AOA
  ),
  budgetAlertPercentages: [50, 75, 90, 100] as const,
});
