import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../../theme/tokens';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

vi.mock('../../lib/store', () => ({
  appStore: {
    get: (...args: unknown[]) => mockStore.get(...args),
    set: (...args: unknown[]) => mockStore.set(...args),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    document.documentElement.style.cssText = '';
  });

  describe('Initial State', () => {
    it('defaults to system mode when no stored preference', async () => {
      mockStore.get.mockResolvedValue(null);
      const { result } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(result.current.mode).toBe('system'));
    });

    it('loads stored theme preference', async () => {
      mockStore.get.mockResolvedValue('dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(result.current.mode).toBe('dark'));
    });
  });

  describe('Theme Toggle Cycling', () => {
    it('cycles light → dark → system → light', async () => {
      mockStore.get.mockResolvedValue('light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(result.current.mode).toBe('light'));

      act(() => result.current.toggleTheme());
      expect(result.current.mode).toBe('dark');

      act(() => result.current.toggleTheme());
      expect(result.current.mode).toBe('system');

      act(() => result.current.toggleTheme());
      expect(result.current.mode).toBe('light');
    });

    it('persists theme changes to store', async () => {
      mockStore.get.mockResolvedValue('light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(result.current.mode).toBe('light'));

      act(() => result.current.toggleTheme());
      await waitFor(() => {
        expect(mockStore.set).toHaveBeenCalledWith('theme-mode', 'dark');
      });
    });
  });

  describe('CSS Variable Application', () => {
    it('applies light theme CSS variables', async () => {
      mockStore.get.mockResolvedValue('light');
      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe(lightTheme.colors.background.primary);
        expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe(lightTheme.colors.text.primary);
      });
    });

    it('applies dark theme CSS variables', async () => {
      mockStore.get.mockResolvedValue('dark');
      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe(darkTheme.colors.background.primary);
        expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe(darkTheme.colors.text.primary);
      });
    });

    it('applies all 14 CSS custom properties', async () => {
      mockStore.get.mockResolvedValue('light');
      renderHook(() => useTheme(), { wrapper });

      const expectedVars = [
        '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-subtle',
        '--text-primary', '--text-secondary', '--text-muted', '--text-emphasis', '--text-accent',
        '--border-primary', '--border-secondary',
        '--interactive-default', '--interactive-hover', '--interactive-active',
      ];

      await waitFor(() => {
        expectedVars.forEach(varName => {
          expect(document.documentElement.style.getPropertyValue(varName)).not.toBe('');
        });
      });
    });
  });

  describe('System Theme Detection', () => {
    it('uses dark theme when system prefers dark', async () => {
      mockStore.get.mockResolvedValue('system');
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toEqual(darkTheme);
      });
    });
  });
});
