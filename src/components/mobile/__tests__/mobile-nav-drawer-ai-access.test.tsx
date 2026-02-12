import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MobileNavDrawer from '../MobileNavDrawer';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { SettingsProvider } from '../../../contexts/SettingsContext';
import { AiAccessProvider } from '../../../contexts/AiAccessContext';
import { MobileNavProvider, useMobileNav } from '../../../contexts/MobileNavContext';

vi.mock('../SideDrawer', () => ({
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div data-testid="mock-side-drawer">{children}</div> : null),
}));

let secureApiKey: string | null = null;

vi.mock('../../../lib/secureStorage', () => ({
  getApiKey: vi.fn(async () => secureApiKey),
  setApiKey: vi.fn(async (apiKey: string) => {
    secureApiKey = apiKey.trim();
  }),
  deleteApiKey: vi.fn(async () => {
    secureApiKey = null;
  }),
  getApiKeyStorageStatus: vi.fn(async () => ({ available: true, message: null })),
  subscribeToApiKeyChanges: vi.fn(() => () => {}),
}));

function OpenNavOnMount() {
  const { openNav } = useMobileNav();

  useEffect(() => {
    openNav();
  }, [openNav]);

  return null;
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderDrawer() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/calendar']}>
        <SettingsProvider>
          <AiAccessProvider>
            <MobileNavProvider>
              <OpenNavOnMount />
              <MobileNavDrawer />
              <LocationDisplay />
            </MobileNavProvider>
          </AiAccessProvider>
        </SettingsProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Mobile Nav Drawer AI Access Gating', () => {
  beforeEach(() => {
    localStorage.clear();
    secureApiKey = null;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows lock icons and blocks navigation when API key is missing', async () => {
    renderDrawer();

    const chatLink = await screen.findByRole('link', { name: /chat/i });
    const insightsLink = screen.getByRole('link', { name: /insights/i });
    expect(document.querySelectorAll('.mobile-nav-drawer__lock-icon')).toHaveLength(2);
    expect(chatLink.querySelectorAll('svg')).toHaveLength(1);
    expect(insightsLink.querySelectorAll('svg')).toHaveLength(1);

    fireEvent.click(chatLink);

    await screen.findByText('OpenAI API key required');
    expect(screen.getByTestId('location')).toHaveTextContent('/calendar');
  });

  it('navigates to chat when API key exists', async () => {
    secureApiKey = 'sk-test-key-12345678901234567890';
    renderDrawer();

    await screen.findByRole('link', { name: /chat/i });
    expect(document.querySelectorAll('.mobile-nav-drawer__lock-icon')).toHaveLength(0);

    fireEvent.click(screen.getByRole('link', { name: /chat/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/chat');
    });
    expect(screen.queryByText('OpenAI API key required')).not.toBeInTheDocument();
  });
});
