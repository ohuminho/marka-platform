import { NextResponse } from "next/server";
import { prisma } from "@/database/client/prisma";
import type { AdvertisementPlacement } from "@/monetization/ads/ad.types";

export const dynamic = "force-dynamic";

const placementMap = {
  mobility_trip: "MOBILITY_TRIP",
  marketplace_feed: "MARKETPLACE_FEED",
  marketplace_product: "MARKETPLACE_PRODUCT",
  community_feed: "COMMUNITY_FEED",
} as const;

function isPlacement(value: string | null): value is AdvertisementPlacement {
  return value === "mobility_trip" ||
    value === "marketplace_feed" ||
    value === "marketplace_product" ||
    value === "community_feed";
}

/**
 * Returns only approved campaigns currently eligible for the requested placement.
 * Draft, paused, rejected, ended and out-of-window campaigns are never exposed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPlacement = searchParams.get("placement");

  if (!isPlacement(requestedPlacement)) {
    return NextResponse.json(
      {
        message: "A valid placement is required.",
        allowed: Object.keys(placementMap),
      },
      { status: 400 }
    );
  }

  const now = new Date();
  try {
    const campaigns = await prisma.advertisementCampaign.findMany({
      where: {
        placement: placementMap[requestedPlacement],
        status: "APPROVED",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: requestedPlacement === "mobility_trip" ? 1 : 3,
      select: {
        id: true,
        advertiserName: true,
        headline: true,
        description: true,
        placement: true,
        creativeType: true,
        creativeUrl: true,
        thumbnailUrl: true,
        destinationUrl: true,
        startsAt: true,
        endsAt: true,
        status: true,
        impressions: true,
        maxImpressions: true,
      },
    });

    const eligibleCampaigns = campaigns.filter((campaign) =>
      campaign.maxImpressions === null || campaign.impressions < campaign.maxImpressions
    );

    return NextResponse.json(
      {
        placement: requestedPlacement,
        advertisements: eligibleCampaigns.map((campaign) => ({
          id: campaign.id,
          campaignId: campaign.id,
          vendorId: campaign.id,
          advertiserName: campaign.advertiserName,
          placement: requestedPlacement,
          active: true,
          label: "Patrocinado" as const,
          headline: campaign.headline,
          description: campaign.description,
          creativeType: campaign.creativeType.toLowerCase(),
          creativeUrl: campaign.creativeUrl,
          thumbnailUrl: campaign.thumbnailUrl,
          destinationUrl: campaign.destinationUrl,
          startsAt: campaign.startsAt?.toISOString(),
          endsAt: campaign.endsAt?.toISOString(),
          status: campaign.status,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error("[MARKA_ADS_DELIVERY_ERROR]", error);
    return NextResponse.json(
      { message: "Advertising inventory is temporarily unavailable." },
      { status: 503 }
    );
  }
}
