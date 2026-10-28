import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MARKA — African Digital Platform",
    short_name: "MARKA",
    description: "Mobilidade, Marketplace e serviços empresariais numa única plataforma.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070707",
    theme_color: "#070707",
    lang: "pt-AO",
    categories: ["business", "travel", "shopping"],
    icons: [
      {
        src: "/marka-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
