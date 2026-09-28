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
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--theme-header)_92%,transparent)] px-4 backdrop-blur-3xl sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1800px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[color-mix(in_srgb,var(--theme-accent)_32%,var(--theme-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-accent)_18%,var(--theme-surface)),var(--theme-surface))] shadow-[0_8px_28px_color-mix(in_srgb,var(--theme-accent)_10%,transparent)]">
            <span className="text-[12px] font-semibold tracking-[0.2em] text-[var(--theme-text)]">M</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[14px] font-semibold tracking-[0.16em] text-[var(--theme-text)]">MARKA</h2>
              <span className="hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/70 px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-[var(--theme-text-faint)] xl:inline-flex">{t.globalPlatform}</span>
            </div>
            <p className="mt-0.5 hidden text-[11px] tracking-[0.04em] text-[var(--theme-text-muted)] sm:block">{t.executiveWorkspace}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5">
          <div className="hidden h-11 w-56 items-center rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface)]/65 px-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--theme-text)_5%,transparent)] md:flex xl:w-72">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--theme-text-faint)]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
            <input aria-label={t.search} placeholder={t.search} className="ml-2.5 w-full bg-transparent text-[12px] text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-faint)]" />
            <span className="hidden rounded-md border border-[var(--theme-border)] px-1.5 py-0.5 text-[8px] text-[var(--theme-text-faint)] xl:block">/</span>
          </div>

          <LanguageSelector />
          <ThemeSelector />

          <div className="ml-1 flex items-center gap-1 border-l border-[var(--theme-border)] pl-2 sm:ml-2 sm:pl-2.5">
            <NotificationButton />
            <CartButton />
          </div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
