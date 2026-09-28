"use client";

import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";
import { MarketplaceProduct } from "../types/marketplace.types";
import VendorTrustBadge from "./VendorTrustBadge";

export default function ProductCard({ product }: { product: MarketplaceProduct }) {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const currency = product.currency || "AOA";

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.10)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(0,0,0,0.16)]">
      <div className="relative aspect-[4/4.3] overflow-hidden rounded-[1.35rem] bg-[var(--theme-background)]">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--theme-text-faint)]">{t.product}</div>
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-header)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)] backdrop-blur-xl">
            {product.category?.name || "MARKA"}
          </span>
          {product.store.verified && (
            <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-header)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text)] backdrop-blur-xl">
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--theme-text)]">{product.name}</h3>
            <p className="mt-1 truncate text-xs text-[var(--theme-text-muted)]">{product.store.name}</p>
          </div>
          <p className="shrink-0 text-base font-semibold text-[var(--theme-text)]">
            {new Intl.NumberFormat(language === "pt" ? "pt-AO" : language, { style: "currency", currency }).format(product.price)}
          </p>
        </div>

        <div className="mt-4">
          <VendorTrustBadge verified={product.store.verified} rating={product.store.rating} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--theme-border)] pt-4">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">{t.stock}: {product.stock}</span>
          <span className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
            {product.status}
          </span>
        </div>
      </div>
    </article>
  );
}
