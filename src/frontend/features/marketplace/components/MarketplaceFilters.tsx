"use client";

import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

interface MarketplaceFiltersProps {
  verifiedOnly: boolean;
  onVerifiedChange: (value: boolean) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export default function MarketplaceFilters({ verifiedOnly, onVerifiedChange, sortBy, onSortChange }: MarketplaceFiltersProps) {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <label className="flex h-11 cursor-pointer items-center gap-3 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-xs text-[var(--theme-text-muted)] backdrop-blur-xl">
        <input type="checkbox" checked={verifiedOnly} onChange={(event) => onVerifiedChange(event.target.checked)} className="accent-current" />
        <span>{t.verifiedVendors}</span>
      </label>

      <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} aria-label={t.latest} className="h-11 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-xs text-[var(--theme-text)] outline-none backdrop-blur-xl">
        <option value="latest">{t.latest}</option>
        <option value="price_asc">{t.priceLowHigh}</option>
        <option value="price_desc">{t.priceHighLow}</option>
      </select>
    </div>
  );
}
