import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app/admin/", "/app/settings/"],
    },
    sitemap: "https://markaao.com/sitemap.xml",
    host: "https://markaao.com",
  };
}
