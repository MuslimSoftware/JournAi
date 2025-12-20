import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { FocusModeProvider } from '../../contexts/FocusModeContext';

vi.mock('../../lib/store', () => ({
  appStore: { get: vi.fn().mockResolvedValue(null), set: vi.fn() },
}));

function TestNavSidebar() {
  const { navPinned, toggleNavPin } = useSidebar();
  return (
    <div
      className={`sidebar ${navPinned ? 'pinned' : ''}`}
      data-testid="nav-sidebar"
    >
      <div className="sidebar-header">
        <button
          className="sidebar-pin-button"
          onClick={toggleNavPin}
          data-testid="nav-pin-button"
        >
          Pin
        </button>
      </div>
      <nav className="sidebar-nav">
        <a className="sidebar-nav-link" href="#">
          <span className="sidebar-nav-icon">Icon</span>
          <span className="sidebar-nav-label" data-testid="nav-label">Label</span>
        </a>
      </nav>
    </div>
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

describe('Sidebar Hover Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Nav Sidebar', () => {
    it('renders without pinned class by default', () => {
      renderWithProviders(<TestNavSidebar />);
      const sidebar = screen.getByTestId('nav-sidebar');
      expect(sidebar).not.toHaveClass('pinned');
    });

    it('adds pinned class when pin button clicked', async () => {
      renderWithProviders(<TestNavSidebar />);
      const pinButton = screen.getByTestId('nav-pin-button');

      fireEvent.click(pinButton);

      await waitFor(() => {
        const sidebar = screen.getByTestId('nav-sidebar');
        expect(sidebar).toHaveClass('pinned');
      });
    });

    it('toggles pinned class on subsequent clicks', async () => {
      renderWithProviders(<TestNavSidebar />);
      const pinButton = screen.getByTestId('nav-pin-button');
      const sidebar = screen.getByTestId('nav-sidebar');

      fireEvent.click(pinButton);
      await waitFor(() => expect(sidebar).toHaveClass('pinned'));

      fireEvent.click(pinButton);
      await waitFor(() => expect(sidebar).not.toHaveClass('pinned'));
    });
  });

  describe('CSS Class Structure', () => {
    it('has correct class structure for expansion', () => {
      renderWithProviders(<TestNavSidebar />);
      const sidebar = screen.getByTestId('nav-sidebar');
      expect(sidebar).toHaveClass('sidebar');
    });
  });
});
