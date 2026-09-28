"use client";

import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

export default function MarketplacePage() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <main className="min-h-screen space-y-12 p-5 sm:p-7 lg:p-10">
      <RoleContextSummary />

      <section className="relative overflow-hidden border-b border-[var(--theme-border)] bg-transparent pb-10 pt-2 lg:pb-14">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--theme-accent)] opacity-10 blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="mb-7 flex items-center justify-between gap-4">
            <p className="marka-kicker">{t.premiumMarketplace}</p>
            <span className="hidden text-[9px] uppercase tracking-[0.24em] text-[var(--theme-text-faint)] sm:block">MARKA / EDITION</span>
          </div>
          <h1 className="marka-editorial mt-5 text-5xl leading-[0.98] text-[var(--theme-text)] lg:text-7xl">{t.marketplaceTitle}</h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--theme-text-muted)] lg:text-base">{t.marketplaceSubtitle}</p>
        </div>
      </section>

      <section className="grid gap-5 border-b border-[var(--theme-border)] pb-8 sm:grid-cols-3">
        {[
          ["Curated", "Seleção editorial"],
          ["Verified", "Lojas verificadas"],
          ["Local", "Experiências em Angola"],
        ].map(([label, detail]) => (
          <div key={label} className="border-l border-[var(--theme-border)] pl-4">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">{label}</p>
            <p className="mt-2 text-sm text-[var(--theme-text-muted)]">{detail}</p>
          </div>
        ))}
      </section>

      <ProductGrid />
    </main>
  );
}
