import type { ButtonHTMLAttributes, ElementType, HTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SyncCard from '../SyncCard';

const syncMock = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('../../../hooks/useSync', () => ({
  useSync: () => syncMock.current,
}));

vi.mock('../../../services/sync', () => ({
  SYNC_PROVIDER_PROFILES: [
    {
      provider: 'google_drive',
      label: 'Google Drive',
      description: 'Stores encrypted JournAi files in Drive app data.',
      authLabel: 'Connect with Google Drive',
      oauthClientIdEnv: 'VITE_GOOGLE_DRIVE_CLIENT_ID',
    },
    {
      provider: 'dropbox',
      label: 'Dropbox',
      description: 'Stores encrypted JournAi files in the app folder.',
      authLabel: 'Connect with Dropbox',
      oauthClientIdEnv: 'VITE_DROPBOX_CLIENT_ID',
    },
  ],
  isOAuthConfigured: () => true,
}));

vi.mock('../../themed', () => ({
  Button: ({
    children,
    icon,
    variant: _variant,
    size: _size,
    iconPosition: _iconPosition,
    fullWidth: _fullWidth,
    ...props
  }: {
    children: ReactNode;
    icon?: ReactNode;
    variant?: string;
    size?: string;
    iconPosition?: string;
    fullWidth?: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
  Spinner: () => <span data-testid="spinner" />,
  Text: ({
    as,
    children,
    variant: _variant,
    ...props
  }: {
    as?: ElementType;
    children: ReactNode;
    variant?: string;
  } & HTMLAttributes<HTMLElement>) => {
    const Component = as ?? 'p';
    return <Component {...props}>{children}</Component>;
  },
}));

function createSyncState(overrides: Record<string, unknown> = {}) {
  return {
    settings: {
      enabled: true,
      provider: 'google_drive',
      deviceId: 'test-device',
      lastSyncedAt: null,
    },
    provider: 'google_drive',
    providerLabel: 'Google Drive',
    accountLabel: 'user@example.com',
    availableProviders: [],
    providerConnections: {
      google_drive: {
        provider: 'google_drive',
        accountLabel: 'user@example.com',
        connected: true,
        status: 'connected',
        message: null,
      },
      dropbox: {
        provider: 'dropbox',
        accountLabel: null,
        connected: false,
        status: 'disconnected',
        message: null,
      },
    },
    connected: true,
    hasSyncKey: true,
    keySetupState: 'ready',
    keySetupMessage: null,
    status: 'connected',
    message: null,
    progress: null,
    summary: null,
    loading: false,
    conflicts: [],
    canSync: true,
    refresh: vi.fn(),
    chooseProvider: vi.fn(),
    toggleEnabled: vi.fn(),
    connectProvider: vi.fn(),
    disconnect: vi.fn(),
    resetSyncSecrets: vi.fn(),
    createKey: vi.fn(),
    unlockKey: vi.fn(),
    runSync: vi.fn().mockResolvedValue({ status: 'success' }),
    resolveConflict: vi.fn(),
    ...overrides,
  };
}

describe('SyncCard', () => {
  beforeEach(() => {
    syncMock.current = createSyncState();
  });

  it('does not render the same hook-owned sync failure twice', async () => {
    const message = 'Google Drive API is disabled for Google Cloud project 159585421383.';
    const runSync = vi.fn().mockRejectedValue(new Error(message));
    syncMock.current = createSyncState({
      status: 'error',
      message,
      runSync,
    });

    render(<SyncCard />);
    await userEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(runSync).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(message)).toHaveLength(1);
  });

  it('uses a fixed preparing progress width instead of an indeterminate bouncing bar', () => {
    syncMock.current = createSyncState({
      status: 'syncing',
      progress: {
        phase: 'preparing',
        message: 'Preparing encrypted sync...',
        current: 0,
        total: 0,
      },
      canSync: false,
    });

    const { container: syncingContainer } = render(<SyncCard />);
    const bar = syncingContainer.querySelector('.settings-progress-bar') as HTMLElement;

    expect(bar).toHaveStyle({ width: '12%' });
    expect(bar).not.toHaveClass('settings-progress-bar--indeterminate');
  });

  it('requires unlocking an existing remote keyset before creating a passphrase', async () => {
    const user = userEvent.setup();
    const createKey = vi.fn();
    const unlockKey = vi.fn().mockResolvedValue(undefined);
    const keySetupMessage = 'Google Drive already has encrypted sync data. Enter its existing passphrase and choose Unlock Existing before creating a new passphrase.';
    syncMock.current = createSyncState({
      hasSyncKey: false,
      keySetupState: 'remote_unlock_required',
      keySetupMessage,
      status: 'needs_configuration',
      message: keySetupMessage,
      canSync: false,
      createKey,
      unlockKey,
    });

    render(<SyncCard />);

    await user.type(screen.getByPlaceholderText(/same passphrase on every device/i), 'correct horse battery');

    expect(screen.getByRole('button', { name: /create passphrase/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unlock existing/i })).toBeEnabled();
    expect(screen.getAllByText(keySetupMessage).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /create passphrase/i }));
    expect(createKey).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /unlock existing/i }));
    expect(unlockKey).toHaveBeenCalledWith('correct horse battery');
  });

  it('surfaces keyset mismatch as a blocking setup error', () => {
    const keySetupMessage = 'Google Drive already has a different sync passphrase. Reset sync on this device or unlock the existing cloud passphrase before syncing.';
    syncMock.current = createSyncState({
      keySetupState: 'mismatch',
      keySetupMessage,
      status: 'error',
      message: keySetupMessage,
      canSync: false,
    });

    render(<SyncCard />);

    expect(screen.getByText(keySetupMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled();
  });
});
