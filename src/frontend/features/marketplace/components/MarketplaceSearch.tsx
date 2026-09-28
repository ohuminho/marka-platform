"use client";

import { useEffect, useState } from "react";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

export default function MarketplaceSearch({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState("");
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 350);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative w-full">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
      </svg>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t.marketplaceSearch}
        aria-label={t.marketplaceSearch}
        className="h-14 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-14 text-sm text-[var(--theme-text)] outline-none backdrop-blur-xl transition placeholder:text-[var(--theme-text-faint)] focus:border-[var(--theme-accent)]"
      />
    </div>
  );
}
