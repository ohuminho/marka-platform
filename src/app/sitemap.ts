import type { MetadataRoute } from "next";
import { prisma } from "@/database/client/prisma";

const baseUrl = "https://markaao.com";
const MAX_DYNAMIC_URLS = 49_995;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/vender`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/mobilidade`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/advertise`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", stock: { gt: 0 }, store: { status: "ACTIVE", vendor: { status: "ACTIVE" } } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_DYNAMIC_URLS,
    });

    const remainingStoreSlots = Math.max(0, MAX_DYNAMIC_URLS - products.length);
    const stores = remainingStoreSlots > 0
      ? await prisma.store.findMany({
          where: { status: "ACTIVE", vendor: { status: "ACTIVE" }, products: { some: { status: "ACTIVE", stock: { gt: 0 } } } },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: remainingStoreSlots,
        })
      : [];

    routes.push(
      ...products.map((product) => ({
        url: `${baseUrl}/produto/${product.id}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...stores.map((store) => ({
        url: `${baseUrl}/loja/${store.id}`,
        lastModified: store.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    );
  } catch (error) {
    console.error("[MARKA_SITEMAP_CATALOG_FAILED]", error);
  }

  return routes;
}
