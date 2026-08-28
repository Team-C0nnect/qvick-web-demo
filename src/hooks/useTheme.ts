import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export type ResolvedTheme = Exclude<Theme, 'system'>;

const THEME_STORAGE_KEY = 'qvick-theme';

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isTheme = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // 저장소 접근 불가 시 시스템 테마를 따른다
  }
  return 'system';
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme !== 'system') return theme;
  return systemDarkQuery.matches ? 'dark' : 'light';
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeState(): ThemeContextValue {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(theme);

    if (theme !== 'system') return;

    const handleSystemChange = () => {
      document.documentElement.dataset.theme = resolveTheme('system');
    };
    systemDarkQuery.addEventListener('change', handleSystemChange);
    return () =>
      systemDarkQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 저장 실패해 세션 동안은 테마 유지
    }
    setThemeState(next);
  }, []);

  return useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme은 ThemeProvider 내부에서 사용해야 합니다.');
  }

  return context;
}
