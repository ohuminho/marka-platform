import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MARKA, African Digital Platform",
    short_name: "MARKA",
    description:
      "Mobilidade, Marketplace e serviços empresariais numa única plataforma.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#070707",
    theme_color: "#070707",
    lang: "pt-PT",
    categories: ["business", "travel", "shopping"],
    icons: [
      {
        src: "/marka-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/marka-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
