"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyThemeToDocument,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type SiteTheme,
} from "@/lib/themeStorage";

import styles from "./ThemeRoot.module.css";

type ThemeContextValue = {
  theme: SiteTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useSiteTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useSiteTheme must be used within ThemeRoot");
  }
  return ctx;
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>("light");

  useLayoutEffect(() => {
    setTheme(resolveThemePreference());
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === "light" || e.newValue === "dark") {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <div className={`st-theme ${styles.root}`} data-theme={theme} suppressHydrationWarning>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
