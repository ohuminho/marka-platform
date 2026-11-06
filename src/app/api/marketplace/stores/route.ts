import { NextResponse } from "next/server";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().slice(0, 120);
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const stores = await prisma.store.findMany({
      where: {
        status: "ACTIVE",
        vendor: { status: "ACTIVE" },
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { vendor: { name: { contains: search, mode: "insensitive" } } },
          ],
        } : {}),
      },
      include: {
        vendor: {
          select: {
            id: true, ownerId: true, organizationId: true, businessType: true, status: true,
            owner: { select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
        _count: { select: { products: { where: { status: "ACTIVE", stock: { gt: 0 } } } } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 60,
    });
    const verification = await getPublicSellerVerification(stores.map((store) => ({
      id: store.vendor.id, ownerId: store.vendor.ownerId, organizationId: store.vendor.organizationId,
      businessType: store.vendor.businessType, status: store.vendor.status,
    })));
    const mapped = stores.map((store) => ({
      id: store.id, name: store.name, description: store.description, logo: store.logo,
      location: store.location, productCount: store._count.products,
      verified: verification.get(store.vendor.id) ?? false,
      owner: {
        id: store.vendor.owner.id,
        name: store.vendor.owner.profile?.displayName || store.vendor.owner.name,
        avatarUrl: store.vendor.owner.profile?.avatarUrl ?? null,
      },
    }));
    return NextResponse.json({
      stores: verifiedOnly ? mapped.filter((store) => store.verified) : mapped,
    }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("[MARKETPLACE_STORES_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível carregar as lojas." }, { status: 500 });
  }
}
