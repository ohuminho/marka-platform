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
    queueMicrotask(() => {
      if (!active) return;
      if (isTheme(storedTheme)) setThemeState(storedTheme);
      if (isLanguage(storedLanguage)) setLanguageState(storedLanguage);
      setHydrated(true);
    });

    const loadAccountLanguage = async (force = false) => {
      try {
        const response = await fetch("/api/preferences/language", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok || !active) return;
        const payload = await response.json() as { language?: unknown; authenticated?: boolean };
        const serverLanguage = typeof payload.language === "string" ? payload.language : null;
        if (isLanguage(serverLanguage)) {
          if (force || !languageChangedByUser.current) {
            setLanguageState(serverLanguage);
            window.localStorage.setItem(LANGUAGE_KEY, serverLanguage);
          }
          return;
        }
        const localLanguage = window.localStorage.getItem(LANGUAGE_KEY);
        if (payload.authenticated && isLanguage(localLanguage)) {
          await fetch("/api/preferences/language", {
            method: "PATCH",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ language: localLanguage }),
          });
        }
      } catch {
        // Guests and temporary network failures continue using the device preference.
      }
    };

    void loadAccountLanguage();
    const handleAuthChanged = () => {
      languageChangedByUser.current = false;
      void loadAccountLanguage(true);
    };
    window.addEventListener("marka:auth-changed", handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("marka:auth-changed", handleAuthChanged);
    };
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

  const setLanguage = useCallback((nextLanguage: PlatformLanguage) => {
    languageChangedByUser.current = true;
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    void fetch("/api/preferences/language", {
      method: "PATCH",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ language: nextLanguage }),
    }).then((response) => {
      if (!response.ok && response.status !== 401) {
        console.error("[MARKA_LANGUAGE_PREFERENCE_SAVE_FAILED]", response.status);
      }
    }).catch((error) => {
      console.error("[MARKA_LANGUAGE_PREFERENCE_SAVE_FAILED]", error);
    });
  }, []);

  const value = useMemo(
    () => ({ theme, language, setTheme: setThemeState, setLanguage }),
    [theme, language, setLanguage]
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
