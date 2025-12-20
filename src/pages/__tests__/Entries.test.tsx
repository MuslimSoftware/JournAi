import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { FocusModeProvider, useFocusMode } from '../../contexts/FocusModeContext';
import { SidebarProvider } from '../../contexts/SidebarContext';

const mockStore = { get: vi.fn(), set: vi.fn() };
vi.mock('../../lib/store', () => ({
  appStore: { get: (...args: unknown[]) => mockStore.get(...args), set: (...args: unknown[]) => mockStore.set(...args) },
}));

function TestEntriesLayout() {
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  return (
    <div className={`entries-layout ${isFocusMode ? 'focus-mode' : ''}`} data-testid="entries-layout">
      <button
        aria-label="focus mode"
        data-testid="focus-button"
        className={`focus-mode-button ${isFocusMode ? 'active' : ''}`}
        onClick={toggleFocusMode}
      >
        Focus
      </button>
    </div>
  );
}

function renderEntries() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SidebarProvider>
          <FocusModeProvider>
            <TestEntriesLayout />
          </FocusModeProvider>
        </SidebarProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('Entries Page Focus Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
  });

  describe('Focus Mode Layout Changes', () => {
    it('applies focus-mode class to layout when activated', async () => {
      renderEntries();

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).not.toHaveClass('focus-mode');
      });

      const focusButton = screen.getByLabelText(/focus mode/i);
      fireEvent.click(focusButton);

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).toHaveClass('focus-mode');
      });
    });

    it('removes focus-mode class when deactivated', async () => {
      renderEntries();

      const focusButton = screen.getByLabelText(/focus mode/i);
      fireEvent.click(focusButton);

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).toHaveClass('focus-mode');
      });

      fireEvent.click(focusButton);

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).not.toHaveClass('focus-mode');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('Escape key exits focus mode', async () => {
      renderEntries();

      const focusButton = screen.getByLabelText(/focus mode/i);
      fireEvent.click(focusButton);

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).toHaveClass('focus-mode');
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).not.toHaveClass('focus-mode');
      });
    });

    it('Cmd+Shift+F toggles focus mode', async () => {
      renderEntries();

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).not.toHaveClass('focus-mode');
      });

      fireEvent.keyDown(document, { key: 'f', metaKey: true, shiftKey: true });

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).toHaveClass('focus-mode');
      });

      fireEvent.keyDown(document, { key: 'f', metaKey: true, shiftKey: true });

      await waitFor(() => {
        const layout = screen.getByTestId('entries-layout');
        expect(layout).not.toHaveClass('focus-mode');
      });
    });
  });
});
