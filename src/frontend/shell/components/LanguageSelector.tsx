"use client";

import { usePlatformPreferences, type PlatformLanguage } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

const languages: { value: PlatformLanguage; label: string }[] = [
  { value: "pt", label: "PT" }, { value: "en", label: "EN" }, { value: "fr", label: "FR" },
];

export default function LanguageSelector() {
  const { language, setLanguage } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <label className="relative">
      <span className="sr-only">{t.language}</span>
      <select aria-label={t.language} value={language} onChange={(event) => setLanguage(event.target.value as PlatformLanguage)}
        className="h-11 w-16 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 text-center text-[10px] font-semibold tracking-[0.12em] text-[var(--theme-text-muted)] outline-none transition hover:text-[var(--theme-text)] focus:border-[var(--theme-accent)]">
        {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
