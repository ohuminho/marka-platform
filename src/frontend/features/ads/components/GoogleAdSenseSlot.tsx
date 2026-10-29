"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

let adsenseScriptPromise: Promise<void> | null = null;

function loadAdSense(clientId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.adsbygoogle) return Promise.resolve();
  if (!adsenseScriptPromise) {
    adsenseScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-marka-adsense="true"]'
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("AdSense failed to load")), { once: true });
        if (window.adsbygoogle) resolve();
        return;
      }
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.markaAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      script.onload = () => resolve();
      script.onerror = () => {
        adsenseScriptPromise = null;
        reject(new Error("AdSense failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return adsenseScriptPromise;
}

/**
 * Optional Google AdSense inventory. It remains absent until a real publisher
 * client ID and a dedicated ad-slot ID are configured in the deployment.
 * MARKA campaign ads remain separate and continue to use SponsoredAdCard.
 */
export default function GoogleAdSenseSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_MARKETPLACE_SLOT_ID?.trim();
  const adRef = useRef<HTMLModElement | null>(null);
  const [failed, setFailed] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!clientId || !slotId || initialized.current) return;
    let cancelled = false;

    loadAdSense(clientId)
      .then(() => {
        if (cancelled || !adRef.current || initialized.current) return;
        initialized.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, slotId]);

  if (!clientId || !slotId || failed) return null;

  return (
    <aside
      aria-label="Publicidade"
      className="min-w-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 sm:p-4"
      data-ad-provider="google-adsense"
    >
      <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
        Publicidade
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[100px] w-full overflow-hidden"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
