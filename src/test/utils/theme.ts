import { lightTheme, darkTheme } from '../../theme/tokens';

export function getCSSVariable(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

export function verifyLightTheme() {
  return {
    bgPrimary: getCSSVariable('--bg-primary') === lightTheme.colors.background.primary,
    textPrimary: getCSSVariable('--text-primary') === lightTheme.colors.text.primary,
  };
}

export function verifyDarkTheme() {
  return {
    bgPrimary: getCSSVariable('--bg-primary') === darkTheme.colors.background.primary,
    textPrimary: getCSSVariable('--text-primary') === darkTheme.colors.text.primary,
  };
}

export const themeColors = {
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    textPrimary: '#1a1a1a',
    textSecondary: '#424242',
  },
  dark: {
    bgPrimary: '#121212',
    bgSecondary: '#1e1e1e',
    textPrimary: '#e0e0e0',
    textSecondary: '#b0b0b0',
  },
};
