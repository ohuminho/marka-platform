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
  zh: {
    executiveWorkspace: "执行工作区", globalPlatform: "全球平台", search: "搜索 MARKA",
    account: "账户", user: "MARKA 用户", theme: "主题", language: "语言",
    themeObsidian: "黑曜石", themeGraphite: "石墨", themeSilver: "银色", themeAurora: "极光",
  },
  ar: {
    executiveWorkspace: "مساحة العمل التنفيذية", globalPlatform: "المنصة العالمية", search: "البحث في MARKA",
    account: "الحساب", user: "مستخدم MARKA", theme: "المظهر", language: "اللغة",
    themeObsidian: "أوبسيديان", themeGraphite: "غرافيت", themeSilver: "فضي", themeAurora: "الشفق",
  },
  os: {
    executiveWorkspace: "Omukalo wOshigwana", globalPlatform: "Oshikandjo shOshigwana", search: "Londula MARKA",
    account: "Akaunti", user: "Omukwatithi wa MARKA", theme: "Omushindo", language: "Olyelyo",
    themeObsidian: "Obsidian", themeGraphite: "Graphite", themeSilver: "Silver", themeAurora: "Aurora",
  },
} satisfies Record<PlatformLanguage, Record<string, string>>;

export function usePlatformTranslation(language: PlatformLanguage) {
  return platformTranslations[language];
}
