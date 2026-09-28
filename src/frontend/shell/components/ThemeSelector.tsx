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
    <label className="group relative flex h-9 w-9 items-center justify-center border border-transparent transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/55 focus-within:border-[var(--theme-accent)]" title={t.theme}>
      <svg viewBox="0 0 24 24" className="pointer-events-none h-4 w-4 text-[var(--theme-text-muted)] transition-colors group-hover:text-[var(--theme-text)]" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4M18.5 18.5l-1.4-1.4M6.9 6.9 5.5 5.5" />
      </svg>
      <span className="sr-only">{t.theme}</span>
      <select aria-label={t.theme} value={theme} onChange={(event) => setTheme(event.target.value as PlatformTheme)} className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-[0px] outline-none">
        {themes.map((item) => <option key={item.value} value={item.value}>{t[item.labelKey]}</option>)}
      </select>
      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-px w-2 -translate-x-1/2 bg-[var(--theme-accent)] opacity-0 transition-opacity group-focus-within:opacity-100" />
    </label>
  );
}
