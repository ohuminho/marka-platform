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
      // Compare-and-increment prevents concurrent requests from overshooting a cap.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const campaign = await prisma.advertisementCampaign.findUnique({
          where: { id: input.campaignId },
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            maxImpressions: true,
            impressions: true,
          },
        });
        if (
          !campaign ||
          campaign.status !== "APPROVED" ||
          (campaign.startsAt !== null && campaign.startsAt > now) ||
          (campaign.endsAt !== null && campaign.endsAt <= now) ||
          (campaign.maxImpressions !== null && campaign.impressions >= campaign.maxImpressions)
        ) {
          return NextResponse.json({ recorded: false }, { status: 409 });
        }

        const updated = await prisma.advertisementCampaign.updateMany({
          where: {
            id: campaign.id,
            status: "APPROVED",
            impressions: campaign.impressions,
          },
          data: { impressions: { increment: 1 } },
        });
        if (updated.count === 1) {
          return NextResponse.json({ recorded: true });
        }
      }
      return NextResponse.json({ recorded: false }, { status: 409 });
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
