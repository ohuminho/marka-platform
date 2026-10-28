import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  campaignId: z.string().uuid(),
  event: z.enum(["impression", "click"]),
});

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

export async function POST(request: Request) {
  try {
    // Metrics must be tied to an authenticated account; anonymous clients cannot
    // freely inflate campaign totals.
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const input = eventSchema.parse(await request.json());
    const now = new Date();
    const eventType = input.event === "impression" ? "IMPRESSION" : "CLICK";
    const eventDay = now.toISOString().slice(0, 10);

    const campaign = await prisma.advertisementCampaign.findFirst({
      where: {
        id: input.campaignId,
        status: "APPROVED",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      select: { id: true, impressions: true, maxImpressions: true },
    });

    if (!campaign) {
      return NextResponse.json({ recorded: false }, { status: 409 });
    }
    if (
      input.event === "impression" &&
      campaign.maxImpressions !== null &&
      campaign.impressions >= campaign.maxImpressions
    ) {
      return NextResponse.json({ recorded: false, reason: "impression_cap_reached" }, { status: 409 });
    }

    try {
      await prisma.advertisementEvent.create({
        data: {
          campaignId: campaign.id,
          userId: session.userId,
          eventType,
          eventDay,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ recorded: false, duplicate: true }, { status: 200 });
      }
      throw error;
    }

    if (input.event === "impression") {
      // Compare-and-increment avoids concurrent requests overshooting a cap.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await prisma.advertisementCampaign.findFirst({
          where: {
            id: campaign.id,
            status: "APPROVED",
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          },
          select: { id: true, impressions: true, maxImpressions: true },
        });

        if (
          !current ||
          (current.maxImpressions !== null && current.impressions >= current.maxImpressions)
        ) {
          await prisma.advertisementEvent.deleteMany({
            where: { campaignId: campaign.id, userId: session.userId, eventType, eventDay },
          });
          return NextResponse.json({ recorded: false, reason: "impression_cap_reached" }, { status: 409 });
        }

        const updated = await prisma.advertisementCampaign.updateMany({
          where: {
            id: current.id,
            status: "APPROVED",
            impressions: current.impressions,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          },
          data: { impressions: { increment: 1 } },
        });

        if (updated.count === 1) {
          return NextResponse.json({ recorded: true, deduplicated: true });
        }
      }

      await prisma.advertisementEvent.deleteMany({
        where: { campaignId: campaign.id, userId: session.userId, eventType, eventDay },
      });
      return NextResponse.json({ recorded: false }, { status: 409 });
    }

    const result = await prisma.advertisementCampaign.updateMany({
      where: {
        id: campaign.id,
        status: "APPROVED",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      data: { clicks: { increment: 1 } },
    });

    if (result.count !== 1) {
      await prisma.advertisementEvent.deleteMany({
        where: { campaignId: campaign.id, userId: session.userId, eventType, eventDay },
      });
    }

    return NextResponse.json(
      { recorded: result.count === 1, deduplicated: true },
      { status: result.count === 1 ? 200 : 409 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Evento publicitário inválido." }, { status: 400 });
    }
    console.error("[MARKA_AD_EVENT_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível registar o evento." }, { status: 503 });
  }
}
