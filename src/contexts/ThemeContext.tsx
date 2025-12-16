import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { appStore } from '../lib/store';
import { ThemeTokens, ThemeMode, lightTheme, darkTheme } from '../theme/tokens';

interface ThemeContextType {
  theme: ThemeTokens;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-mode';

async function getInitialTheme(): Promise<ThemeMode> {
  const stored = await appStore.get<ThemeMode>(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);
  const theme = mode === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    getInitialTheme().then((initialMode) => {
      setMode(initialMode);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    appStore.set(THEME_STORAGE_KEY, mode);

    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.background.primary);
    root.style.setProperty('--bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.colors.background.tertiary);
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-accent', theme.colors.text.accent);
    root.style.setProperty('--border-primary', theme.colors.border.primary);
    root.style.setProperty('--border-secondary', theme.colors.border.secondary);
    root.style.setProperty('--interactive-default', theme.colors.interactive.default);
    root.style.setProperty('--interactive-hover', theme.colors.interactive.hover);
    root.style.setProperty('--interactive-active', theme.colors.interactive.active);
  }, [mode, theme, isLoaded]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
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
