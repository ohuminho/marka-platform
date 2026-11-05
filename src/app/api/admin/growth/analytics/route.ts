import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, role: true, isFounder: true },
  });
  if (!user || user.status !== "ACTIVE" || !(user.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role))) {
    return { error: NextResponse.json({ message: "Acesso administrativo necessário." }, { status: 403 }) };
  }
  return { user };
}

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [grouped, uniqueRows, aiUsageEvents] = await Promise.all([
      prisma.domainEvent.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: from }, eventType: { startsWith: "GROWTH." } },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ unique_visitors: bigint }>>`
        SELECT COUNT(DISTINCT "aggregateId")::bigint AS unique_visitors
        FROM "DomainEvent"
        WHERE "eventType" LIKE 'GROWTH.%' AND "createdAt" >= ${from}
      `,
      prisma.securityEvent.findMany({
        where: { type: "AI_CORE_USAGE", createdAt: { gte: from } },
        orderBy: { createdAt: "desc" },
        take: 10000,
        select: { metadata: true },
      }),
    ]);

    const counts = Object.fromEntries(grouped.map((item) => [item.eventType, item._count._all]));
    const metric = (name: string) => counts[`GROWTH.${name}`] ?? 0;
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    let inputTokens = 0;
    let outputTokens = 0;
    const byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number }> = {};
    for (const event of aiUsageEvents) {
      const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? event.metadata as Record<string, unknown>
        : {};
      const input = numeric(metadata.inputTokens);
      const output = numeric(metadata.outputTokens);
      const model = typeof metadata.model === "string" && metadata.model.length <= 100 ? metadata.model : "unknown";
      inputTokens += input;
      outputTokens += output;
      byModel[model] ??= { requests: 0, inputTokens: 0, outputTokens: 0 };
      byModel[model].requests += 1;
      byModel[model].inputTokens += input;
      byModel[model].outputTokens += output;
    }

    return NextResponse.json({
      period: { from: from.toISOString(), to: now.toISOString(), days: 30 },
      totals: {
        events: total,
        uniqueIdentities: Number(uniqueRows[0]?.unique_visitors ?? 0),
        pageViews: metric("PAGE_VIEW"),
        marketplaceViews: metric("MARKETPLACE_VIEW"),
        productViews: metric("PRODUCT_VIEW"),
        storeViews: metric("STORE_VIEW"),
        searches: metric("SEARCH"),
        addToCart: metric("ADD_TO_CART"),
      },
      funnel: {
        productViewToCartEventRate: metric("PRODUCT_VIEW") > 0
          ? Number((metric("ADD_TO_CART") / metric("PRODUCT_VIEW")).toFixed(4))
          : null,
        cartToPurchaseEventRate: null,
      },
      aiCore: {
        requests: aiUsageEvents.length,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        byModel,
        truncated: aiUsageEvents.length === 10000,
      },
      source: "MARKA_DOMAIN_EVENTS_AND_AI_CORE_USAGE",
      note: "Os rácios são contagens de eventos, não conversões únicas por utilizador. Identificadores distintos não equivalem a indivíduos únicos: uma pessoa pode gerar um ID anónimo e outro autenticado. Compras e inscrições não são apresentadas até estarem instrumentadas a partir de fontes transaccionais confirmadas. A utilização AI Core é registada sem guardar prompts ou respostas.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_GROWTH_ANALYTICS]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível consultar as métricas de crescimento." }, { status: 503 });
  }
}
