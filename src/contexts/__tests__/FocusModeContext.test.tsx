import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { FocusModeProvider, useFocusMode } from '../FocusModeContext';

const mockStore = { get: vi.fn(), set: vi.fn() };
vi.mock('../../lib/store', () => ({
  appStore: { get: (...args: unknown[]) => mockStore.get(...args), set: (...args: unknown[]) => mockStore.set(...args) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <FocusModeProvider>{children}</FocusModeProvider>;
}

describe('FocusModeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
  });

  describe('Initial State', () => {
    it('defaults to not in focus mode', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });
      expect(result.current.isFocusMode).toBe(false);
    });

    it('loads focus mode state from store', async () => {
      mockStore.get.mockResolvedValue(true);
      const { result } = renderHook(() => useFocusMode(), { wrapper });
      await waitFor(() => expect(result.current.isFocusMode).toBe(true));
    });
  });

  describe('Toggle Functions', () => {
    it('toggleFocusMode toggles state', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      act(() => result.current.toggleFocusMode());
      expect(result.current.isFocusMode).toBe(true);

      act(() => result.current.toggleFocusMode());
      expect(result.current.isFocusMode).toBe(false);
    });

    it('enterFocusMode sets state to true', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      act(() => result.current.enterFocusMode());
      expect(result.current.isFocusMode).toBe(true);

      act(() => result.current.enterFocusMode());
      expect(result.current.isFocusMode).toBe(true);
    });

    it('exitFocusMode sets state to false', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      act(() => result.current.enterFocusMode());
      act(() => result.current.exitFocusMode());
      expect(result.current.isFocusMode).toBe(false);
    });

    it('persists state to store on change', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      act(() => result.current.toggleFocusMode());
      await waitFor(() => {
        expect(mockStore.set).toHaveBeenCalledWith('focus-mode-active', true);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('Cmd+Shift+F toggles focus mode', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(result.current.isFocusMode).toBe(true);
    });

    it('Ctrl+Shift+F toggles focus mode', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(result.current.isFocusMode).toBe(true);
    });

    it('Escape exits focus mode', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      act(() => result.current.enterFocusMode());
      expect(result.current.isFocusMode).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(result.current.isFocusMode).toBe(false);
    });

    it('Escape does nothing when not in focus mode', async () => {
      const { result } = renderHook(() => useFocusMode(), { wrapper });

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(result.current.isFocusMode).toBe(false);
    });
  });
});
