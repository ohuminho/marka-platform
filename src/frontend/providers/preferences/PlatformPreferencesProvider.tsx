"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type PlatformTheme = "pearl" | "obsidian" | "noir" | "sable" | "silver" | "midnight" | "blue";
export type PlatformLanguage = "pt" | "en" | "fr" | "zh" | "ar" | "os";

type PlatformPreferences = {
  theme: PlatformTheme;
  language: PlatformLanguage;
  setTheme: (theme: PlatformTheme) => void;
  setLanguage: (language: PlatformLanguage) => void;
};

const THEME_KEY = "marka.platform.theme.v2";
const LANGUAGE_KEY = "marka.platform.language";

const context = createContext<PlatformPreferences | null>(null);

const isTheme = (value: string | null): value is PlatformTheme =>
  value === "pearl" || value === "obsidian" || value === "noir" || value === "sable" || value === "silver" || value === "midnight" || value === "blue";

const isLanguage = (value: string | null): value is PlatformLanguage =>
  value === "pt" || value === "en" || value === "fr" || value === "zh" || value === "ar" || value === "os";

const isRtlLanguage = (language: PlatformLanguage) => language === "ar";

export function PlatformPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PlatformTheme>("pearl");
  const [language, setLanguageState] = useState<PlatformLanguage>("pt");
  const [hydrated, setHydrated] = useState(false);
  const languageChangedByUser = useRef(false);

  useEffect(() => {
    let active = true;
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    if (isTheme(storedTheme)) setThemeState(storedTheme);
    if (isLanguage(storedLanguage)) setLanguageState(storedLanguage);
    setHydrated(true);

    // An authenticated account is authoritative across browsers and devices.
    void fetch("/api/preferences/language", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { language?: unknown };
      const serverLanguage = typeof payload.language === "string" ? payload.language : null;
      if (active && !languageChangedByUser.current && isLanguage(serverLanguage)) {
        setLanguageState(serverLanguage);
        window.localStorage.setItem(LANGUAGE_KEY, serverLanguage);
      }
    }).catch(() => {
      // Guests and temporary network failures continue using the device preference.
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language, hydrated]);

  const value = useMemo(
    () => ({ theme, language, setTheme: setThemeState, setLanguage: setLanguageState }),
    [theme, language]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function usePlatformPreferences() {
  const value = useContext(context);
  if (!value) {
    throw new Error("usePlatformPreferences must be used inside PlatformPreferencesProvider.");
  }
  return value;
}
