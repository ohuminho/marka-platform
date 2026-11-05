import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const token = (await cookies()).get("marka_session")?.value;
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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const grouped = await prisma.domainEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: from }, eventType: { startsWith: "GROWTH." } },
      _count: { _all: true },
    });

    const counts = Object.fromEntries(grouped.map((item) => [item.eventType, item._count._all]));
    const metric = (name: string) => counts[`GROWTH.${name}`] ?? 0;
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    return NextResponse.json({
      period: { from: from.toISOString(), to: now.toISOString(), days: 30 },
      totals: {
        events: total,
        pageViews: metric("PAGE_VIEW"),
        marketplaceViews: metric("MARKETPLACE_VIEW"),
        productViews: metric("PRODUCT_VIEW"),
        storeViews: metric("STORE_VIEW"),
        searches: metric("SEARCH"),
        addToCart: metric("ADD_TO_CART"),
        signUps: metric("SIGN_UP"),
        purchases: metric("PURCHASE"),
      },
      funnel: {
        productViewToCartRate: metric("PRODUCT_VIEW") > 0
          ? Number((metric("ADD_TO_CART") / metric("PRODUCT_VIEW")).toFixed(4))
          : null,
        cartToPurchaseRate: metric("ADD_TO_CART") > 0
          ? Number((metric("PURCHASE") / metric("ADD_TO_CART")).toFixed(4))
          : null,
      },
      source: "MARKA_DOMAIN_EVENTS",
      note: "Os rácios são indicadores de eventos, não conversões por utilizador; a instrumentação de eventos de compra só deve ocorrer após confirmação efectiva do pagamento.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_GROWTH_ANALYTICS]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível consultar as métricas de crescimento." }, { status: 503 });
  }
}
