"use client";

import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

export default function MarketplacePage() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <main className="min-h-screen space-y-10 p-6 lg:p-10">
      <RoleContextSummary />

      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.12)] backdrop-blur-2xl lg:p-12">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--theme-accent)] opacity-20 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--theme-text-muted)]">{t.premiumMarketplace}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--theme-text)] lg:text-6xl">{t.marketplaceTitle}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--theme-text-muted)] lg:text-lg">{t.marketplaceSubtitle}</p>
        </div>
      </section>

      <ProductGrid />
    </main>
  );
}
