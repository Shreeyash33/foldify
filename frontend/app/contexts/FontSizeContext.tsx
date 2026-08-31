'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export const FONT_SIZE_STORAGE_KEY = 'foldify-font-size';

/**
 * Pre-paint script — same pattern as THEME_INIT_SCRIPT.
 * Sets a CSS class on <html> before first paint so the correct font size
 * is visible immediately, no flash.
 */
export const FONT_SIZE_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  FONT_SIZE_STORAGE_KEY,
)});if(s==="sm"||s==="base"||s==="lg"||s==="xl"||s==="2xl"){document.documentElement.classList.add("fs-"+s);}}catch(e){}})()`;

const FONT_SIZE_CLASS: Record<FontSizeLevel, string> = {
  sm: 'fs-sm',
  base: '',
  lg: 'fs-lg',
  xl: 'fs-xl',
  '2xl': 'fs-2xl',
};

const LEVEL_LABELS: Record<FontSizeLevel, string> = {
  sm: 'Small',
  base: 'Default',
  lg: 'Large',
  xl: 'Extra Large',
  '2xl': 'Extra Extra Large',
};

interface FontSizeContextValue {
  fontSize: FontSizeLevel;
  setFontSize: (level: FontSizeLevel) => void;
  label: string;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

function applyFontSize(level: FontSizeLevel): void {
  // Remove all fs-* classes, then add the new one (empty string = no class for base).
  for (const cls of Object.values(FONT_SIZE_CLASS)) {
    if (cls !== '') document.documentElement.classList.remove(cls);
  }
  const next = FONT_SIZE_CLASS[level];
  if (next !== '') document.documentElement.classList.add(next);
}

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(() => {
    if (typeof document === 'undefined') return 'base';
    for (const level of Object.keys(FONT_SIZE_CLASS) as FontSizeLevel[]) {
      if (document.documentElement.classList.contains(FONT_SIZE_CLASS[level])) return level;
    }
    return 'base';
  });

  const setFontSize = useCallback((next: FontSizeLevel) => {
    setFontSizeState(next);
    applyFontSize(next);
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, next);
    } catch {
      // Private browsing — still applies for this load.
    }
  }, []);

  const value = useMemo(
    () => ({ fontSize, setFontSize, label: LEVEL_LABELS[fontSize] }),
    [fontSize, setFontSize],
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize(): FontSizeContextValue {
  const context = useContext(FontSizeContext);
  if (context === null) throw new Error('useFontSize must be used inside <FontSizeProvider>.');
  return context;
}
