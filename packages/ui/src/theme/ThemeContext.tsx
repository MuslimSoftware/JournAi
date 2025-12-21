import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { appStore } from '@journai/core/tauri';
import { ThemeTokens, ThemeMode, lightTheme, darkTheme } from './tokens';

interface ThemeContextType {
  theme: ThemeTokens;
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-mode';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

async function getInitialTheme(): Promise<ThemeMode> {
  const stored = await appStore.get<ThemeMode>(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedMode = mode === 'system' ? getSystemTheme() : mode;
  const theme = resolvedMode === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    getInitialTheme().then((initialMode) => {
      setMode(initialMode);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      const newTheme = getSystemTheme() === 'light' ? lightTheme : darkTheme;
      root.style.setProperty('--bg-primary', newTheme.colors.background.primary);
      root.style.setProperty('--bg-secondary', newTheme.colors.background.secondary);
      root.style.setProperty('--bg-tertiary', newTheme.colors.background.tertiary);
      root.style.setProperty('--bg-subtle', newTheme.colors.background.subtle);
      root.style.setProperty('--text-primary', newTheme.colors.text.primary);
      root.style.setProperty('--text-secondary', newTheme.colors.text.secondary);
      root.style.setProperty('--text-muted', newTheme.colors.text.muted);
      root.style.setProperty('--text-emphasis', newTheme.colors.text.emphasis);
      root.style.setProperty('--text-accent', newTheme.colors.text.accent);
      root.style.setProperty('--border-primary', newTheme.colors.border.primary);
      root.style.setProperty('--border-secondary', newTheme.colors.border.secondary);
      root.style.setProperty('--interactive-default', newTheme.colors.interactive.default);
      root.style.setProperty('--interactive-hover', newTheme.colors.interactive.hover);
      root.style.setProperty('--interactive-active', newTheme.colors.interactive.active);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  useEffect(() => {
    if (!isLoaded) return;

    appStore.set(THEME_STORAGE_KEY, mode);

    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.background.primary);
    root.style.setProperty('--bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.colors.background.tertiary);
    root.style.setProperty('--bg-subtle', theme.colors.background.subtle);
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-muted', theme.colors.text.muted);
    root.style.setProperty('--text-emphasis', theme.colors.text.emphasis);
    root.style.setProperty('--text-accent', theme.colors.text.accent);
    root.style.setProperty('--border-primary', theme.colors.border.primary);
    root.style.setProperty('--border-secondary', theme.colors.border.secondary);
    root.style.setProperty('--interactive-default', theme.colors.interactive.default);
    root.style.setProperty('--interactive-hover', theme.colors.interactive.hover);
    root.style.setProperty('--interactive-active', theme.colors.interactive.active);
  }, [mode, theme, isLoaded]);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const toggleTheme = () => {
    setMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
