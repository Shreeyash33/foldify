'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'foldify-theme';

/**
 * The inline script that runs in <head> before the first paint.
 *
 * Reading localStorage in an effect means the page paints light and then flips.
 * A theme flash on every load is the most visible possible flaw in a
 * design-led project, so the class goes on <html> during HTML parsing,
 * before React exists. layout.tsx injects this string; ThemeContext then
 * reads back whatever the script decided rather than deciding again.
 *
 * Kept as a string so the exact same source is used by both.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})()`;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /**
   * Lazy initialiser, matching the inline script exactly. Because the script
   * has already set the class, this reads the decision rather than remaking
   * it — React's first render therefore agrees with the DOM and no flash or
   * hydration mismatch is possible.
   */
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing or a storage quota. The theme still applies for
      // this page load; it just will not be remembered.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  /**
   * Follow the OS setting only while the user has made no choice of their own.
   * Once they touch the toggle, the stored value wins forever.
   */
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');

    const onChange = (event: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        stored = null;
      }
      if (stored === 'light' || stored === 'dark') return;

      const next: Theme = event.matches ? 'dark' : 'light';
      setThemeState(next);
      applyTheme(next);
    };

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}
