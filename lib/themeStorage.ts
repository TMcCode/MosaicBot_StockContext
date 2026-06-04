/** Shared preference key with stockthemes.ai sister site. */
export const THEME_STORAGE_KEY = "stockthemes-theme";

export type SiteTheme = "light" | "dark";

export function readStoredTheme(): SiteTheme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function readThemeFromDocument(): SiteTheme | null {
  if (typeof document === "undefined") return null;
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || t === "light" ? t : null;
}

export function applyThemeToDocument(theme: SiteTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function resolveThemePreference(): SiteTheme {
  return readThemeFromDocument() ?? readStoredTheme();
}

export function themeInitScriptContent(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  return `(function(){try{var k=${key};var t=localStorage.getItem(k);var d=t==="dark"?"dark":"light";document.documentElement.setAttribute("data-theme",d);document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light";}})();`;
}
