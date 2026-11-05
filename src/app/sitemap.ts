import type { MetadataRoute } from "next";
import { prisma } from "@/database/client/prisma";

const baseUrl = "https://markaao.com";

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
      where: {
        status: "ACTIVE",
        stock: { gt: 0 },
        store: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50000,
    });

    routes.push(...products.map((product) => ({
      url: `${baseUrl}/produto/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })));
  } catch (error) {
    console.error("[MARKA_SITEMAP_PRODUCTS_FAILED]", error);
  }

  return routes;
}
