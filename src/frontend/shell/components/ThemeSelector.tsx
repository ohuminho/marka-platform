"use client";

import { usePlatformPreferences, type PlatformTheme } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

const themes: { value: PlatformTheme; labelKey: "themeObsidian" | "themeGraphite" | "themeSilver" | "themeAurora" | "themePearl" }[] = [
  { value: "obsidian", labelKey: "themeObsidian" },
  { value: "graphite", labelKey: "themeGraphite" },
  { value: "silver", labelKey: "themeSilver" },
  { value: "aurora", labelKey: "themeAurora" },
  { value: "pearl", labelKey: "themePearl" },
];

export default function ThemeSelector() {
  const { theme, language, setTheme } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <label className="group relative flex h-10 items-center rounded-[13px] border border-transparent bg-transparent transition-all hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] focus-within:border-[var(--theme-accent)]">
      <span className="pointer-events-none flex h-full items-center pl-2.5 text-[var(--theme-text-muted)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4M18.5 18.5l-1.4-1.4M6.9 6.9 5.5 5.5" />
        </svg>
      </span>
      <span className="sr-only">{t.theme}</span>
      <select aria-label={t.theme} value={theme} onChange={(event) => setTheme(event.target.value as PlatformTheme)} className="h-10 w-[46px] cursor-pointer appearance-none bg-transparent px-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--theme-text-muted)] outline-none">
        {themes.map((item) => <option key={item.value} value={item.value}>{t[item.labelKey]}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 h-3 w-3 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m5 7.5 5 5 5-5" /></svg>
    </label>
  );
}
