export function isFreightPostCompletionStatus(status: string): boolean {
  return status === "PROVIDER_COMPLETED_PENDING_CONFIRMATION";
}
