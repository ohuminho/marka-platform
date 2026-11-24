import type { Metadata } from "next";
import type { ReactNode } from "react";

const siteUrl = "https://markaao.com";

export const metadata: Metadata = {
  title: "Publicidade e parcerias comerciais em Angola | MARKA",
  description:
    "Conheça as oportunidades de publicidade, campanhas de marca e parcerias comerciais na MARKA. Envie o seu pedido à equipa comercial.",
  alternates: { canonical: "/advertise" },
  openGraph: {
    title: "Publicidade e parcerias comerciais | MARKA",
    description:
      "Apresente a sua marca e explore oportunidades de publicidade e parceria no ecossistema MARKA.",
    url: `${siteUrl}/advertise`,
    siteName: "MARKA AO",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Publicidade e parcerias comerciais | MARKA",
    description:
      "Explore oportunidades de publicidade e parceria no ecossistema MARKA.",
  },
};

export default function AdvertiseLayout({ children }: { children: ReactNode }) {
  return children;
}
