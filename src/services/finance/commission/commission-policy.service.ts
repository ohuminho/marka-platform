export type CommissionPolicyChannel =
  | "MARKETPLACE"
  | "TAXI"
  | "MOTO_TAXI";

export interface CommissionPolicy {
  key: string;
  version: number;
  channel: CommissionPolicyChannel;
  rateBps: number;
  vendorRateBps: number;
  effectiveFrom: Date;
}

const BPS_TOTAL = 10_000;

const COMMISSION_POLICIES: Record<
  CommissionPolicyChannel,
  CommissionPolicy
> = {
  MARKETPLACE: {
    key: "MARKETPLACE_STANDARD",
    version: 1,
    channel: "MARKETPLACE",
    rateBps: 1_000,
    vendorRateBps: 9_000,
    effectiveFrom: new Date(
      "2026-09-23T00:00:00.000Z"
    ),
  },

  TAXI: {
    key: "MOBILITY_TAXI_STANDARD",
    version: 1,
    channel: "TAXI",
    rateBps: 1_200,
    vendorRateBps: 8_800,
    effectiveFrom: new Date(
      "2026-09-23T00:00:00.000Z"
    ),
  },

  MOTO_TAXI: {
    key: "MOBILITY_MOTO_TAXI_STANDARD",
    version: 1,
    channel: "MOTO_TAXI",
    rateBps: 1_000,
    vendorRateBps: 9_000,
    effectiveFrom: new Date(
      "2026-09-23T00:00:00.000Z"
    ),
  },
};

export class CommissionPolicyService {
  get(
    channel: CommissionPolicyChannel
  ): CommissionPolicy {
    const policy =
      COMMISSION_POLICIES[channel];

    if (!policy) {
      throw new Error(
        `Commission policy "${channel}" is not configured.`
      );
    }

    if (
      policy.rateBps < 0 ||
      policy.vendorRateBps < 0 ||
      policy.rateBps +
        policy.vendorRateBps !==
        BPS_TOTAL
    ) {
      throw new Error(
        `Commission policy "${policy.key}" is mathematically invalid.`
      );
    }

    return {
      ...policy,
      effectiveFrom:
        new Date(
          policy.effectiveFrom
        ),
    };
  }

  getMarketplacePolicy(): CommissionPolicy {
    return this.get("MARKETPLACE");
  }

  getTaxiPolicy(): CommissionPolicy {
    return this.get("TAXI");
  }

  getMotoTaxiPolicy(): CommissionPolicy {
    return this.get("MOTO_TAXI");
  }
}

export const commissionPolicyService =
  new CommissionPolicyService();
