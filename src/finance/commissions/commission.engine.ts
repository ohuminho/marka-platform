export function calculateCommission(
  amount: number,
  percentage: number
) {
  return amount * (percentage / 100);
}
