"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function MobilityAdSlot() {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_MARKA_MOBILITY_ADSENSE_SLOT;

  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers, consent settings or unavailable inventory must not affect Mobility.
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <aside aria-label="Publicidade" className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/70 px-4 py-3 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Publicidade</span>
        <span className="text-[9px] text-[var(--theme-text-faint)]">Conteúdo patrocinado</span>
      </div>
      <Script
        id="marka-adsense"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      />
      <ins
        className="adsbygoogle block min-h-[90px] w-full overflow-hidden"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
