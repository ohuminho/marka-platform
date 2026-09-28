import type { PlatformLanguage } from "./PlatformPreferencesProvider";

export const platformTranslations = {
  pt: {
    executiveWorkspace: "Espaço Executivo", globalPlatform: "Plataforma Global", search: "Pesquisar MARKA",
    account: "Conta", user: "Utilizador MARKA", theme: "Tema", language: "Idioma",
    themeObsidian: "Obsidian", themeGraphite: "Graphite", themeSilver: "Silver", themeAurora: "Aurora",
  },
  en: {
    executiveWorkspace: "Executive Workspace", globalPlatform: "Global Platform", search: "Search MARKA",
    account: "Account", user: "MARKA User", theme: "Theme", language: "Language",
    themeObsidian: "Obsidian", themeGraphite: "Graphite", themeSilver: "Silver", themeAurora: "Aurora",
  },
  fr: {
    executiveWorkspace: "Espace Exécutif", globalPlatform: "Plateforme Globale", search: "Rechercher MARKA",
    account: "Compte", user: "Utilisateur MARKA", theme: "Thème", language: "Langue",
    themeObsidian: "Obsidienne", themeGraphite: "Graphite", themeSilver: "Argent", themeAurora: "Aurore",
  },
} satisfies Record<PlatformLanguage, Record<string, string>>;

export function usePlatformTranslation(language: PlatformLanguage) {
  return platformTranslations[language];
}
