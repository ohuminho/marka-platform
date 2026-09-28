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
    <label className="relative">
      <span className="sr-only">{t.language}</span>
      <select
        aria-label={t.language}
        value={language}
        onChange={(event) => setLanguage(event.target.value as PlatformLanguage)}
        className="h-11 min-w-16 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 text-center text-[10px] font-semibold tracking-[0.12em] text-[var(--theme-text-muted)] outline-none transition hover:text-[var(--theme-text)] focus:border-[var(--theme-accent)]"
      >
        {languages.map((item) => (
          <option key={item.value} value={item.value}>{item.label} — {item.name}</option>
        ))}
      </select>
    </label>
  );
}
