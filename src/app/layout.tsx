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
  title: "MARKA — African Digital Platform",
  applicationName: "MARKA",
  description:
    "Mobilidade, Marketplace e serviços empresariais numa única plataforma.",
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


export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {

  return (

    <html
      lang="pt-AO"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        h-full
        antialiased
      `}
    >

      <body
        className="
          min-h-full
          flex
          flex-col
        "
      >

        <AppProvider>

          {children}

        </AppProvider>


      </body>


    </html>

  );

}
