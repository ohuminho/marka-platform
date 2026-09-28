"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PlatformTheme = "obsidian" | "graphite" | "silver" | "aurora" | "pearl";
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
  value === "obsidian" || value === "graphite" || value === "silver" || value === "aurora" || value === "pearl";

const isLanguage = (value: string | null): value is PlatformLanguage =>
  value === "pt" || value === "en" || value === "fr" || value === "zh" || value === "ar" || value === "os";

const isRtlLanguage = (language: PlatformLanguage) => language === "ar";

export function PlatformPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PlatformTheme>("pearl");
  const [language, setLanguageState] = useState<PlatformLanguage>("pt");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    // The persisted values are client-only; hydration must complete before applying them.
    if (isTheme(storedTheme)) setThemeState(storedTheme);
    if (isLanguage(storedLanguage)) setLanguageState(storedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

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
