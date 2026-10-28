"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Advertisement,
  AdvertisementPlacement,
  MobilityAdContext,
} from "@/monetization/ads/ad.types";
import { AD_UX_LIMITS, canShowAdvertisement } from "@/monetization/ads/ad-policy";

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
  const [dismissed, setDismissed] = useState(false);
  const [sessionLimitReached, setSessionLimitReached] = useState(true);
  const cardRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const impressionSent = useRef(false);
  const maxVideoSeconds = placement === "mobility_trip"
    ? AD_UX_LIMITS.mobilityVideoMaxSeconds
    : AD_UX_LIMITS.marketplaceVideoMaxSeconds;

  useEffect(() => {
    try {
      const count = Number(window.sessionStorage.getItem("marka_ads_viewed_session") || "0");
      setSessionLimitReached(Number.isFinite(count) && count >= AD_UX_LIMITS.maxAdsPerSession);
    } catch {
      // If storage is unavailable, fail closed instead of showing unlimited ads.
      setSessionLimitReached(true);
    }
  }, []);

  useEffect(() => {
    const node = cardRef.current;
    if (sessionLimitReached || !node || impressionSent.current || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!timer) {
          timer = setTimeout(() => {
            if (impressionSent.current) return;
            try {
              const count = Number(window.sessionStorage.getItem("marka_ads_viewed_session") || "0");
              if (!Number.isFinite(count) || count >= AD_UX_LIMITS.maxAdsPerSession) {
                setSessionLimitReached(true);
                return;
              }
              // Reserve the slot synchronously so multiple ad cards cannot exceed the cap in one tab.
              window.sessionStorage.setItem("marka_ads_viewed_session", String(count + 1));
            } catch {
              setSessionLimitReached(true);
              return;
            }
            impressionSent.current = true;
            void fetch("/api/ads/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaignId: advertisement.campaignId || advertisement.id,
                event: "impression",
              }),
              keepalive: true,
            }).catch(() => undefined);
          }, 1000);
        }
      } else if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [0, 0.5, 1] });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [advertisement.campaignId, advertisement.id, sessionLimitReached]);

  if (
    dismissed ||
    sessionLimitReached ||
    !advertisement.active ||
    (advertisement.status && advertisement.status !== "APPROVED") ||
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
      ref={cardRef}
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
          ref={videoRef}
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
          onTimeUpdate={() => {
            const video = videoRef.current;
            if (video && video.currentTime >= maxVideoSeconds) {
              video.pause();
              video.currentTime = maxVideoSeconds;
            }
          }}
        />
      ) : creative ? (
        <img
          src={creative}
          alt={advertisement.headline || "Imagem patrocinada"}
          className="block max-h-44 w-full object-cover"
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
            onClick={() => {
              void fetch("/api/ads/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaignId: advertisement.campaignId || advertisement.id,
                  event: "click",
                }),
                keepalive: true,
              }).catch(() => undefined);
            }}
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
