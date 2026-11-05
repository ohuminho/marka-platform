import type { MetadataRoute } from "next";

const baseUrl = "https://markaao.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { route: "/", priority: 1, changeFrequency: "daily" as const },
    { route: "/marketplace", priority: 0.9, changeFrequency: "daily" as const },
    { route: "/vender", priority: 0.8, changeFrequency: "weekly" as const },
    { route: "/mobilidade", priority: 0.8, changeFrequency: "weekly" as const },
    { route: "/advertise", priority: 0.7, changeFrequency: "weekly" as const },
  ];

  return routes.map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
