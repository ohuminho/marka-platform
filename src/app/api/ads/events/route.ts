import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  campaignId: z.string().uuid(),
  event: z.enum(["impression", "click"]),
});

export async function POST(request: Request) {
  try {
    const input = eventSchema.parse(await request.json());
    const now = new Date();

    if (input.event === "impression") {
      const result = await prisma.advertisementCampaign.updateMany({
        where: {
          id: input.campaignId,
          status: "APPROVED",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            { OR: [{ maxImpressions: null }, { impressions: { lt: 0 } }] },
          ],
        },
        data: { impressions: { increment: 1 } },
      });
      // The database-level date/status filters are authoritative. A max-impression
      // cap is also checked by the delivery API before a creative is returned.
      if (result.count === 0) {
        const campaign = await prisma.advertisementCampaign.findFirst({
          where: { id: input.campaignId, status: "APPROVED" },
          select: { id: true, maxImpressions: true, impressions: true },
        });
        if (!campaign || (campaign.maxImpressions !== null && campaign.impressions >= campaign.maxImpressions)) {
          return NextResponse.json({ recorded: false }, { status: 409 });
        }
        const retry = await prisma.advertisementCampaign.updateMany({
          where: {
            id: input.campaignId,
            status: "APPROVED",
            impressions: campaign.impressions,
          },
          data: { impressions: { increment: 1 } },
        });
        return NextResponse.json({ recorded: retry.count === 1 });
      }
      return NextResponse.json({ recorded: true });
    }

    const result = await prisma.advertisementCampaign.updateMany({
      where: {
        id: input.campaignId,
        status: "APPROVED",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.json({ recorded: result.count === 1 }, { status: result.count ? 200 : 409 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Evento publicitário inválido." }, { status: 400 });
    }
    console.error("[MARKA_AD_EVENT_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível registar o evento." }, { status: 503 });
  }
}
