import { calculateSplit } from "@/services/mobility/pricing/mobility-split.service";

export interface FreightQuoteSplitSnapshot {
  version: 1;
  serviceType: "carga";
  currency: "AOA";
  totalKz: number;
  commissionRate: number;
  platformFeeKz: number;
  providerAmountKz: number;
  policyKey: "MOBILITY_CARGO_STANDARD";
  policyVersion: 1;
}

/**
 * Validate the immutable cargo quote split against the server-approved quote.
 * Returns a canonical snapshot only when every persisted field matches.
 */
export function validateFreightQuoteSplitSnapshot(
  details: unknown,
  quotedAmountKz: number,
): FreightQuoteSplitSnapshot | null {
  if (!Number.isSafeInteger(quotedAmountKz) || quotedAmountKz <= 0) return null;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;

  const snapshot = (details as Record<string, unknown>).quoteSplitSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;

  const value = snapshot as Record<string, unknown>;
  const expected = calculateSplit(quotedAmountKz, "carga");
  const valid =
    value.version === 1 &&
    value.serviceType === "carga" &&
    value.currency === "AOA" &&
    value.totalKz === expected.totalKz &&
    value.commissionRate === expected.commissionRate &&
    value.platformFeeKz === expected.platformFeeKz &&
    value.providerAmountKz === expected.providerAmountKz &&
    value.policyKey === "MOBILITY_CARGO_STANDARD" &&
    value.policyVersion === 1;

  if (!valid) return null;

  return {
    version: 1,
    serviceType: "carga",
    currency: "AOA",
    totalKz: expected.totalKz,
    commissionRate: expected.commissionRate,
    platformFeeKz: expected.platformFeeKz,
    providerAmountKz: expected.providerAmountKz,
    policyKey: "MOBILITY_CARGO_STANDARD",
    policyVersion: 1,
  };
}
