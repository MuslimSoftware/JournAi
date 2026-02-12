import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  IoBook,
  IoBookOutline,
  IoCalendar,
  IoCalendarOutline,
  IoChatbubble,
  IoChatbubbleOutline,
  IoSparkles,
  IoSparklesOutline,
} from 'react-icons/io5';
import Sidebar from '../Sidebar';
import SettingsModal from '../SettingsModal';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { AiAccessProvider } from '../../contexts/AiAccessContext';

const navItems = [
  { path: '/calendar', label: 'Calendar', icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: '/entries', label: 'Entries', icon: IoBookOutline, iconFilled: IoBook },
  { path: '/chat', label: 'Chat', icon: IoChatbubbleOutline, iconFilled: IoChatbubble, requiresApiKey: true },
  { path: '/insights', label: 'Insights', icon: IoSparklesOutline, iconFilled: IoSparkles, requiresApiKey: true },
];

let secureApiKey: string | null = null;

vi.mock('../../lib/secureStorage', () => ({
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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function SettingsModalHarness() {
  const { isOpen, closeSettings, initialSection, openSignal } = useSettings();
  return (
    <SettingsModal
      isOpen={isOpen}
      onClose={closeSettings}
      initialSection={initialSection}
      openSignal={openSignal}
    />
  );
}

function renderSidebar() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/calendar']}>
        <SidebarProvider>
          <SettingsProvider>
            <AiAccessProvider>
              <Sidebar items={navItems} onOpenSettings={() => {}} />
              <LocationDisplay />
              <SettingsModalHarness />
            </AiAccessProvider>
          </SettingsProvider>
        </SidebarProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Sidebar AI Access Gating', () => {
  beforeEach(() => {
    localStorage.clear();
    secureApiKey = null;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('locks Chat and Insights and opens the gate modal when API key is missing', async () => {
    renderSidebar();

    const chatLink = screen.getByRole('link', { name: /chat/i });
    const insightsLink = screen.getByRole('link', { name: /insights/i });

    expect(chatLink).toHaveClass('sidebar-nav-link--locked');
    expect(insightsLink).toHaveClass('sidebar-nav-link--locked');
    expect(document.querySelectorAll('.sidebar-nav-lock-icon')).toHaveLength(2);
    expect(chatLink.querySelectorAll('svg')).toHaveLength(1);
    expect(insightsLink.querySelectorAll('svg')).toHaveLength(1);

    fireEvent.click(chatLink);

    await screen.findByText('OpenAI API key required');
    expect(screen.getByText(/Chat requires an OpenAI API key to use AI features/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/calendar');
  });

  it('opens settings directly on the AI section when Go to Settings is clicked', async () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('link', { name: /insights/i }));

    await screen.findByText('OpenAI API key required');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Settings' }));

    await screen.findByText('AI Configuration');
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
  });

  it('locks Memory & RAG settings and opens the gate modal when API key is missing', async () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('link', { name: /insights/i }));
    await screen.findByText('OpenAI API key required');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Settings' }));

    const memoryLabel = await screen.findByText('Memory & RAG');
    expect(memoryLabel.closest('.settings-sidebar-item')).toHaveClass('settings-sidebar-item--locked');

    fireEvent.click(memoryLabel);

    await screen.findByText('OpenAI API key required');
    expect(screen.getByText(/Memory & RAG requires an OpenAI API key to use AI features/i)).toBeInTheDocument();
    expect(screen.getByText('AI Configuration')).toBeInTheDocument();
  });

  it('go to settings redirects to AI even when settings is already open', async () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('link', { name: /insights/i }));
    await screen.findByText('OpenAI API key required');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Settings' }));
    await screen.findByText('AI Configuration');

    const personalizationItem = Array.from(document.querySelectorAll('.settings-sidebar-item'))
      .find((item) => item.textContent?.includes('Personalization')) as HTMLElement | undefined;
    expect(personalizationItem).toBeTruthy();
    fireEvent.click(personalizationItem!);
    expect(screen.getByText('Theme')).toBeInTheDocument();

    const memoryItem = Array.from(document.querySelectorAll('.settings-sidebar-item'))
      .find((item) => item.textContent?.includes('Memory & RAG')) as HTMLElement | undefined;
    expect(memoryItem).toBeTruthy();
    fireEvent.click(memoryItem!);

    await screen.findByText('OpenAI API key required');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Settings' }));

    await screen.findByText('AI Configuration');
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
  });

  it('allows navigation to Chat when API key exists', async () => {
    secureApiKey = 'sk-test-key-12345678901234567890';
    renderSidebar();

    const chatLink = screen.getByRole('link', { name: /chat/i });
    await waitFor(() => {
      expect(chatLink).not.toHaveClass('sidebar-nav-link--locked');
    });

    fireEvent.click(chatLink);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/chat');
    });
    expect(screen.queryByText('OpenAI API key required')).not.toBeInTheDocument();
  });
});
