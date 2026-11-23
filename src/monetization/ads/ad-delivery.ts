import type { AdvertisementCreativeType } from "@/monetization/ads/ad.types";

type CampaignDeliveryState = {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  impressions: number;
  maxImpressions: number | null;
  creativeType: AdvertisementCreativeType | string;
  creativeUrl: string | null;
};

/**
 * Final server-side guard for campaign delivery.
 * Keep this check even when the database query already filters status and dates:
 * inventory and creative safety must be evaluated immediately before serialization.
 */
export function isAdvertisementCampaignDeliverable(
  campaign: CampaignDeliveryState,
  now: Date,
  isSafeCreativeUrl: (value: string | null) => boolean,
): boolean {
  if (campaign.status !== "APPROVED") return false;
  if (campaign.startsAt && campaign.startsAt.getTime() > now.getTime()) return false;
  if (campaign.endsAt && campaign.endsAt.getTime() <= now.getTime()) return false;
  if (campaign.maxImpressions !== null && campaign.impressions >= campaign.maxImpressions) return false;
  if (campaign.creativeType !== "NATIVE" && !isSafeCreativeUrl(campaign.creativeUrl)) return false;
  return true;
}
