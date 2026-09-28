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
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--theme-border)_58%,transparent)] bg-[color-mix(in_srgb,var(--theme-header)_84%,transparent)] px-3 backdrop-blur-3xl sm:px-5 lg:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-accent)_38%,transparent),transparent)]" />
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1880px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[color-mix(in_srgb,var(--theme-accent)_34%,var(--theme-border))] bg-[radial-gradient(circle_at_35%_25%,color-mix(in_srgb,var(--theme-accent)_22%,transparent),transparent_58%),linear-gradient(145deg,color-mix(in_srgb,var(--theme-accent)_14%,var(--theme-surface)),var(--theme-surface))] shadow-[0_7px_26px_color-mix(in_srgb,var(--theme-accent)_10%,transparent)]">
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_25%,color-mix(in_srgb,var(--theme-text)_10%,transparent)_48%,transparent_70%)] opacity-50" />
            <span className="relative text-[11px] font-semibold tracking-[0.18em] text-[var(--theme-text)]">M</span>
          </div>
          <div className="min-w-0 border-l border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] pl-3 sm:pl-4">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-[13px] font-semibold tracking-[0.24em] text-[var(--theme-text)]">MARKA</h2>
              <span className="hidden text-[8px] font-medium uppercase tracking-[0.24em] text-[var(--theme-text-faint)] xl:inline">{t.globalPlatform}</span>
            </div>
            <p className="mt-0.5 hidden text-[10px] tracking-[0.1em] text-[var(--theme-text-faint)] sm:block">{t.executiveWorkspace}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <div className="hidden h-9 w-44 items-center border-b border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] px-1 transition-colors focus-within:border-[var(--theme-accent)] md:flex lg:w-52 xl:w-64">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.35">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
            <input aria-label={t.search} placeholder={t.search} className="ml-2.5 w-full bg-transparent text-[11px] tracking-[0.04em] text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-faint)]" />
            <span className="hidden text-[8px] tracking-[0.14em] text-[var(--theme-text-faint)] xl:block">/</span>
          </div>

          <div className="ml-2 flex items-center sm:ml-3">
            <LanguageSelector />
            <ThemeSelector />
          </div>

          <div className="ml-2 flex items-center border-l border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] pl-2 sm:ml-3 sm:pl-3">
            <NotificationButton />
            <CartButton />
          </div>

          <div className="ml-1 border-l border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] pl-1 sm:ml-2 sm:pl-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
