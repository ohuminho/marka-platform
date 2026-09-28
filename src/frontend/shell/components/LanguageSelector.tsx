"use client";

import { usePlatformPreferences, type PlatformLanguage } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

const languages: { value: PlatformLanguage; label: string; name: string }[] = [
  { value: "pt", label: "PT", name: "Português" },
  { value: "en", label: "EN", name: "English" },
  { value: "fr", label: "FR", name: "Français" },
  { value: "zh", label: "中", name: "中文" },
  { value: "ar", label: "ع", name: "العربية" },
  { value: "os", label: "OS", name: "Oshiwambo" },
];

export default function LanguageSelector() {
  const { language, setLanguage } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <label className="group relative flex h-9 w-9 items-center justify-center border border-transparent transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/55 focus-within:border-[var(--theme-accent)]" title={t.language}>
      <svg viewBox="0 0 24 24" className="pointer-events-none h-4 w-4 text-[var(--theme-text-muted)] transition-colors group-hover:text-[var(--theme-text)]" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.7 2.5 4.1 5.5 4.1 9s-1.4 6.5-4.1 9c-2.7-2.5-4.1-6.5-4.1-9S9.3 5.5 12 3Z" />
      </svg>
      <span className="sr-only">{t.language}</span>
      <select aria-label={t.language} value={language} onChange={(event) => setLanguage(event.target.value as PlatformLanguage)} className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-[0px] outline-none">
        {languages.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.name}</option>)}
      </select>
      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-px w-2 -translate-x-1/2 bg-[var(--theme-accent)] opacity-0 transition-opacity group-focus-within:opacity-100" />
    </label>
  );
}
