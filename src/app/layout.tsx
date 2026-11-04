import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import AppProvider from "@/frontend/providers/AppProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://markaao.com"),
  title: {
    default: "MARKA — A nova economia digital",
    template: "%s | MARKA",
  },
  applicationName: "MARKA",
  description:
    "Comércio, mobilidade, serviços e oportunidades reunidos numa única plataforma digital em Angola.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MARKA — A nova economia digital",
    description:
      "Descubra produtos, lojas, mobilidade, serviços e oportunidades numa única plataforma.",
    url: "https://markaao.com",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA — A nova economia digital",
    description:
      "Comércio, mobilidade, serviços e oportunidades numa única plataforma.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MARKA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#070707",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-AO" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
