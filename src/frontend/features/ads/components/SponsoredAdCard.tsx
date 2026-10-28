"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Advertisement,
  AdvertisementPlacement,
  MobilityAdContext,
} from "@/monetization/ads/ad.types";
import { canShowAdvertisement } from "@/monetization/ads/ad-policy";

type SponsoredAdCardProps = {
  advertisement: Advertisement;
  placement: AdvertisementPlacement;
  context: MobilityAdContext;
  onDismiss?: (advertisementId: string, dismissedAt: number) => void;
};

export default function SponsoredAdCard({
  advertisement,
  placement,
  context,
  onDismiss,
}: SponsoredAdCardProps) {
  const [dismissed, setDismissed] = useState(false);\n  const cardRef = useRef<HTMLElement | null>(null);\n  const impressionSent = useRef(false);\n\n  useEffect(() => {\n    const node = cardRef.current;\n    if (!node || impressionSent.current || typeof IntersectionObserver === "undefined") return;\n    let timer: ReturnType<typeof setTimeout> | undefined;\n    const observer = new IntersectionObserver((entries) => {\n      const entry = entries[0];\n      if (!entry) return;\n      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {\n        if (!timer) timer = setTimeout(() => {\n          if (impressionSent.current) return;\n          impressionSent.current = true;\n          void fetch("/api/ads/events", {\n            method: "POST",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ campaignId: advertisement.campaignId || advertisement.id, event: "impression" }),\n            keepalive: true,\n          }).catch(() => undefined);\n        }, 1000);\n      } else if (timer) {\n        clearTimeout(timer);\n        timer = undefined;\n      }\n    }, { threshold: [0, 0.5, 1] });\n    observer.observe(node);\n    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };\n  }, [advertisement.campaignId, advertisement.id]);

  if (
    dismissed ||
    !advertisement.active ||
    advertisement.status && advertisement.status !== "APPROVED" ||
    !canShowAdvertisement(placement, context)
  ) {
    return null;
  }

  function dismiss() {
    const dismissedAt = Date.now();
    setDismissed(true);
    onDismiss?.(advertisement.id, dismissedAt);
  }

  const creative = advertisement.creativeUrl;
  const destination = advertisement.destinationUrl;

  return (
    <aside
      aria-label="Publicidade patrocinada"
      className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]"
      data-ad-placement={placement}
      data-ad-id={advertisement.id}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-[var(--theme-border)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
            Patrocinado
          </span>
          {advertisement.advertiserName && (
            <span className="truncate text-xs text-[var(--theme-text-muted)]">
              {advertisement.advertiserName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ocultar publicidade"
          className="shrink-0 rounded-full px-2.5 py-1 text-xs text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-background)]"
        >
          Ocultar
        </button>
      </div>

      {creative && advertisement.creativeType === "video" ? (
        <video
          className="block max-h-44 w-full bg-black object-cover sm:max-h-52"
          src={creative}
          poster={advertisement.thumbnailUrl}
          muted
          playsInline
          autoPlay
          loop={false}
          controls
          preload="metadata"
          aria-label={advertisement.headline || "Vídeo patrocinado"}
        />
      ) : creative ? (
        <img
          src={creative}
          alt={advertisement.headline || "Imagem patrocinada"}
          className="block max-h-44 w-full object-cover sm:max-h-52"
          loading="lazy"
        />
      ) : null}

      <div className="p-4">
        {advertisement.headline && (
          <h3 className="text-sm font-semibold text-[var(--theme-text)]">
            {advertisement.headline}
          </h3>
        )}
        {advertisement.description && (
          <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">
            {advertisement.description}
          </p>
        )}
        {destination && (
          <a
            href={destination}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-[var(--theme-text)] px-4 py-2 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-85"
          >
            Saber mais
          </a>
        )}
      </div>
    </aside>
  );
}
