"use client";

import NotificationButton from "./components/NotificationButton";
import CartButton from "./components/CartButton";
import UserMenu from "./components/UserMenu";
import ThemeSelector from "./components/ThemeSelector";
import LanguageSelector from "./components/LanguageSelector";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

export default function TopNav() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);

  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-header)] px-8 backdrop-blur-2xl lg:px-10">
      <div className="flex items-center gap-6">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
          <span className="relative text-[13px] font-semibold tracking-[0.18em] text-[var(--theme-text)]">M</span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-medium tracking-[0.12em] text-[var(--theme-text)]">MARKA</h2>
            <span className="hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--theme-text-muted)] sm:inline-flex">{t.globalPlatform}</span>
          </div>
          <p className="mt-1 text-xs tracking-wide text-[var(--theme-text-muted)]">{t.executiveWorkspace}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden h-12 w-80 items-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 md:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
          </svg>
          <input aria-label={t.search} placeholder={t.search} className="ml-3 w-full bg-transparent text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-faint)]" />
          <span className="hidden rounded-lg border border-[var(--theme-border)] px-2 py-1 text-[9px] tracking-wider text-[var(--theme-text-faint)] lg:block">/</span>
        </div>

        <LanguageSelector />
        <ThemeSelector />

        <div className="flex h-12 items-center gap-1 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-1">
          <NotificationButton />
          <CartButton />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
