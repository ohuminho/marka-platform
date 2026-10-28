export type AdvertisementPlacement =
  | "mobility_trip"
  | "marketplace_feed"
  | "marketplace_product"
  | "community_feed";

export type AdvertisementCreativeType = "image" | "video" | "native";

export type AdvertiserCampaignStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PAUSED"
  | "REJECTED"
  | "ENDED";

export interface Advertisement {
  id: string;
  vendorId: string;
  placement: AdvertisementPlacement;
  active: boolean;
  campaignId?: string;
  advertiserName?: string;
  label?: "Patrocinado";
  creativeType?: AdvertisementCreativeType;
  creativeUrl?: string;
  thumbnailUrl?: string;
  destinationUrl?: string;
  headline?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: AdvertiserCampaignStatus;
}

export interface MobilityAdContext {
  adsEnabled: boolean;
  userDismissed?: boolean;
  reducedMotion?: boolean;
  rideStatus?: string | null;
  tripStartedAt?: number | null;
  isNearDestination?: boolean;
  isNavigationActive?: boolean;
  isPaymentFlowActive?: boolean;
  isSafetyFlowActive?: boolean;
  isCheckoutActive?: boolean;
  lastAdDismissedAt?: number | null;
}
