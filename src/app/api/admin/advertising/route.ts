import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

const createSchema = z.object({
  advertiserName: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  placement: z.enum(["MOBILITY_TRIP", "MARKETPLACE_FEED", "MARKETPLACE_PRODUCT", "COMMUNITY_FEED"]),
  creativeType: z.enum(["IMAGE", "VIDEO", "NATIVE"]),
  creativeUrl: z.string().url().max(2000).optional().or(z.literal("")),
  thumbnailUrl: z.string().url().max(2000).optional().or(z.literal("")),
  destinationUrl: z.string().url().max(2000).optional().or(z.literal("")),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
}).refine((value) => value.creativeType === "NATIVE" || Boolean(value.creativeUrl), {
  message: "Imagem e vídeo precisam de um URL de conteúdo.",
  path: ["creativeUrl"],
}).refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
  message: "A data final deve ser posterior à data inicial.",
  path: ["endsAt"],
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["APPROVED", "PAUSED", "REJECTED", "ENDED"]),
});

async function requireAdmin() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, role: true },
  });
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ message: "Administrative access required." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const campaigns = await prisma.advertisementCampaign.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        dailyBudgetMinor: campaign.dailyBudgetMinor?.toString() ?? null,
        totalBudgetMinor: campaign.totalBudgetMinor?.toString() ?? null,
      })),
    });
  } catch (error) {
    console.error("[MARKA_AD_ADMIN_LIST_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível carregar as campanhas." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const input = createSchema.parse(await request.json());
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const campaign = await prisma.advertisementCampaign.create({
      data: {
        advertiserName: input.advertiserName,
        headline: input.headline,
        description: input.description || null,
        placement: input.placement,
        creativeType: input.creativeType,
        creativeUrl: input.creativeUrl || null,
        thumbnailUrl: input.thumbnailUrl || null,
        destinationUrl: input.destinationUrl || null,
        startsAt,
        endsAt,
        status: "PENDING_REVIEW",
      },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dados da campanha inválidos.", issues: error.issues }, { status: 400 });
    }
    console.error("[MARKA_AD_ADMIN_CREATE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível criar a campanha." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const input = updateSchema.parse(await request.json());
    const existing = await prisma.advertisementCampaign.findUnique({ where: { id: input.id } });
    if (!existing) return NextResponse.json({ message: "Campanha não encontrada." }, { status: 404 });
    const campaign = await prisma.advertisementCampaign.update({
      where: { id: input.id },
      data: { status: input.status },
    });
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dados de atualização inválidos.", issues: error.issues }, { status: 400 });
    }
    console.error("[MARKA_AD_ADMIN_UPDATE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível atualizar a campanha." }, { status: 503 });
  }
}
