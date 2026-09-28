"use client";

import { usePlatformPreferences, type PlatformTheme } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

const themes: { value: PlatformTheme; labelKey: "themeObsidian" | "themeGraphite" | "themeSilver" | "themeAurora" | "themePearl" }[] = [
  { value: "obsidian", labelKey: "themeObsidian" },
  { value: "graphite", labelKey: "themeGraphite" },
  { value: "silver", labelKey: "themeSilver" },
  { value: "aurora", labelKey: "themeAurora" },\n  { value: "pearl", labelKey: "themePearl" },
];

export default function ThemeSelector() {
  const { theme, language, setTheme } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <label className="relative">
      <span className="sr-only">{t.theme}</span>
      <select aria-label={t.theme} value={theme} onChange={(event) => setTheme(event.target.value as PlatformTheme)}
        className="h-11 max-w-28 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 pr-7 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--theme-text-muted)] outline-none transition hover:text-[var(--theme-text)] focus:border-[var(--theme-accent)]">
        {themes.map((item) => <option key={item.value} value={item.value}>{t[item.labelKey]}</option>)}
      </select>
    </label>
  );
}
