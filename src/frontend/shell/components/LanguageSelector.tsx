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
    <label className="group relative flex h-10 items-center rounded-[13px] border border-transparent bg-transparent transition-all hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] focus-within:border-[var(--theme-accent)]">
      <span className="pointer-events-none flex h-full items-center pl-2.5 text-[var(--theme-text-muted)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.7 2.5 4.1 5.5 4.1 9s-1.4 6.5-4.1 9c-2.7-2.5-4.1-5.5-4.1-9S9.3 5.5 12 3Z" />
        </svg>
      </span>
      <span className="sr-only">{t.language}</span>
      <select aria-label={t.language} value={language} onChange={(event) => setLanguage(event.target.value as PlatformLanguage)} className="h-10 w-[42px] cursor-pointer appearance-none bg-transparent px-0 text-center text-[9px] font-semibold tracking-[0.1em] text-[var(--theme-text-muted)] outline-none">
        {languages.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.name}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 h-3 w-3 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m5 7.5 5 5 5-5" /></svg>
    </label>
  );
}
