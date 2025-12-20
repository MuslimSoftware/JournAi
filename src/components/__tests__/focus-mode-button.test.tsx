import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusModeProvider, useFocusMode } from '../../contexts/FocusModeContext';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

vi.mock('../../lib/store', () => ({
  appStore: { get: vi.fn().mockResolvedValue(null), set: vi.fn() },
}));

const FADE_DELAY_MS = 2000;
const EDGE_THRESHOLD_PX = 150;

function FocusModeButton() {
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  const [buttonHidden, setButtonHidden] = useState(false);
  const [isNearEdge, setIsNearEdge] = useState(false);

  useEffect(() => {
    if (isFocusMode) {
      setButtonHidden(false);
      const timer = setTimeout(() => setButtonHidden(true), FADE_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      setButtonHidden(false);
      setIsNearEdge(false);
    }
  }, [isFocusMode]);

  useEffect(() => {
    if (!isFocusMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      setIsNearEdge(e.clientX <= EDGE_THRESHOLD_PX);
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isFocusMode]);

  return (
    <button
      data-testid="focus-mode-button"
      className={`focus-mode-button${isFocusMode ? ' active' : ''}${buttonHidden ? ' hidden' : ''}${isNearEdge ? ' near-edge' : ''}`}
      onClick={toggleFocusMode}
    >
      Focus
    </button>
  );
}

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      <SidebarProvider>
        <FocusModeProvider>
          {ui}
        </FocusModeProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

describe('Focus Mode Button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Active State', () => {
    it('has active class when focus mode is on', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);

      expect(button).toHaveClass('active');
    });

    it('removes active class when focus mode is off', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);
      expect(button).toHaveClass('active');

      fireEvent.click(button);
      expect(button).not.toHaveClass('active');
    });
  });

  describe('Auto-Hide Behavior', () => {
    it('button visible initially in focus mode', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);

      expect(button).not.toHaveClass('hidden');
    });

    it('button hides after 2 seconds in focus mode', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);
      expect(button).not.toHaveClass('hidden');

      act(() => {
        vi.advanceTimersByTime(FADE_DELAY_MS);
      });

      expect(button).toHaveClass('hidden');
    });

    it('button becomes visible again when exiting focus mode', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);
      act(() => vi.advanceTimersByTime(FADE_DELAY_MS));
      expect(button).toHaveClass('hidden');

      fireEvent.click(button);
      expect(button).not.toHaveClass('hidden');
    });
  });

  describe('Edge Detection', () => {
    it('adds near-edge class when mouse near left edge in focus mode', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);
      act(() => vi.advanceTimersByTime(FADE_DELAY_MS));

      fireEvent.mouseMove(document, { clientX: 100 });

      expect(button).toHaveClass('near-edge');
    });

    it('removes near-edge class when mouse moves away', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.click(button);
      fireEvent.mouseMove(document, { clientX: 100 });
      expect(button).toHaveClass('near-edge');

      fireEvent.mouseMove(document, { clientX: 200 });
      expect(button).not.toHaveClass('near-edge');
    });

    it('does not track mouse position when not in focus mode', async () => {
      renderWithProviders(<FocusModeButton />);
      const button = screen.getByTestId('focus-mode-button');

      fireEvent.mouseMove(document, { clientX: 50 });

      expect(button).not.toHaveClass('near-edge');
    });
  });
});
