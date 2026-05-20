import { useState } from 'react';
import {
  IoCloudOutline,
  IoKeyOutline,
  IoLogInOutline,
  IoLogoDropbox,
  IoLogoGoogle,
  IoRefresh,
  IoTrashOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import { Button, Spinner, Text } from '../themed';
import StatusMessage from './StatusMessage';
import { useSync } from '../../hooks/useSync';
import { SYNC_PROVIDER_PROFILES, isOAuthConfigured } from '../../services/sync';
import type { SyncProgress, SyncProvider } from '../../types/sync';
import ConflictResolutionModal from './ConflictResolutionModal';
import '../../styles/settings.css';

const VISIBLE_SYNC_PROVIDERS: SyncProvider[] = ['google_drive'];

function formatSyncTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

function statusLabel(status: string): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'syncing':
      return 'Syncing';
    case 'success':
      return 'Synced';
    case 'needs_configuration':
      return 'Needs setup';
    case 'error':
      return 'Error';
    case 'disconnected':
      return 'Disconnected';
    case 'disabled':
    default:
      return 'Off';
  }
}

function syncProgressWidth(progress: SyncProgress): string {
  if (progress.total <= 0) {
    return progress.phase === 'finalizing' ? '96%' : '12%';
  }

  const percent = Math.round((progress.current / progress.total) * 100);
  return `${Math.min(100, Math.max(0, percent))}%`;
}

function providerIcon(provider: SyncProvider) {
  switch (provider) {
    case 'google_drive':
      return <IoLogoGoogle size={16} />;
    case 'dropbox':
      return <IoLogoDropbox size={16} />;
    case 'onedrive':
    case 'icloud':
      return null;
    default:
      provider satisfies never;
      return null;
  }
}

export default function SyncCard() {
  const {
    settings,
    provider,
    providerConnections,
    connected,
    hasSyncKey,
    keySetupState,
    keySetupMessage,
    status,
    message,
    progress,
    summary,
    loading,
    canSync,
    connectProvider,
    disconnect,
    resetSyncSecrets,
    createKey,
    unlockKey,
    runSync,
    conflicts,
  } = useSync();
  const [passphrase, setPassphrase] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<SyncProvider | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const visibleProfiles = SYNC_PROVIDER_PROFILES.filter((profile) => VISIBLE_SYNC_PROVIDERS.includes(profile.provider));
  const activeProfile = provider ? SYNC_PROVIDER_PROFILES.find((profile) => profile.provider === provider) : null;
  const connectedProfile = visibleProfiles.find((profile) => providerConnections[profile.provider]?.connected) ?? null;
  const syncTargetLabel = activeProfile?.label ?? connectedProfile?.label ?? 'provider';
  const readyToSync = connected && hasSyncKey;
  const remoteUnlockRequired = keySetupState === 'remote_unlock_required';
  const providerNote = readyToSync
    ? 'Ready to upload encrypted journal entries, todos, and sticky notes.'
    : connected
      ? remoteUnlockRequired
        ? 'Connected. Unlock the existing cloud passphrase before syncing or creating a new one.'
        : 'Connected. Finish the passphrase step above before syncing.'
      : hasSyncKey
        ? 'Connect Google Drive or Dropbox to sync encrypted JournAi files with devices you own.'
        : 'Then connect Google Drive or Dropbox with the same cloud account on each device.';
  const passphraseNote = keySetupMessage
    ?? 'Create it on the first device. On another device, connect the same cloud account below, then unlock existing data with that passphrase.';

  const handleConnectProvider = async (nextProvider: SyncProvider) => {
    setActionError(null);
    setConnectingProvider(nextProvider);
    try {
      await connectProvider(nextProvider);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to connect provider.');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleCreateKey = async () => {
    setActionError(null);
    setSavingKey(true);
    try {
      await createKey(passphrase);
      setPassphrase('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to configure sync key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleUnlockKey = async () => {
    setActionError(null);
    setSavingKey(true);
    try {
      await unlockKey(passphrase);
      setPassphrase('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to unlock sync key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleSyncNow = async () => {
    setActionError(null);
    try {
      await runSync();
    } catch {
      // useSync owns the visible sync failure state.
    }
  };

  if (loading) {
    return (
      <div className="settings-sync-card">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="settings-sync-card">
      <div className="settings-sync-header">
        <div className="settings-sync-heading">
          <span className="settings-sync-heading__icon" aria-hidden="true">
            <IoCloudOutline size={24} />
          </span>
          <div className="settings-sync-heading__copy">
            <Text variant="primary" className="settings-sync-title">Cloud Sync</Text>
            <Text variant="secondary" className="settings-sync-subtitle">
              {status === 'syncing' ? progress?.message ?? 'Syncing encrypted data...' : connected ? `${statusLabel(status)} with ${syncTargetLabel}` : 'Connect a provider to sync'}
            </Text>
          </div>
        </div>
      </div>

      <div className="settings-sync-passphrase-block">
        <div className="settings-sync-row">
          <div>
            <Text variant="primary" className="settings-sync-row__title">Private Sync Passphrase</Text>
            <Text variant="secondary" className="settings-sync-row__text">
              {hasSyncKey
                ? 'Configured. Use this same passphrase on every device connected to this cloud account.'
                : 'JournAi uses this passphrase to encrypt journal entries, todos, and sticky notes before upload. Use the same exact passphrase on your phone and laptop to share the data.'}
            </Text>
          </div>
          {hasSyncKey ? (
            <Button variant="danger" size="sm" icon={<IoTrashOutline size={14} />} onClick={() => { void resetSyncSecrets(); }}>
              Reset
            </Button>
          ) : null}
        </div>

        {!hasSyncKey && (
          <div className="settings-field settings-sync-passphrase-field">
            <label className="settings-label">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="settings-input settings-input--full-padding"
              placeholder="Same passphrase on every device"
            />
            <Text variant="secondary" className="settings-sync-passphrase-note">
              {passphraseNote}
            </Text>
            <div className="settings-footer settings-footer--compact settings-sync-passphrase-actions">
              <Button
                variant="secondary"
                size="sm"
                icon={<IoKeyOutline size={14} />}
                onClick={handleCreateKey}
                disabled={passphrase.trim().length < 12 || savingKey || remoteUnlockRequired}
              >
                {savingKey ? 'Saving...' : 'Create Passphrase'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnlockKey}
                disabled={passphrase.trim().length < 12 || savingKey || !connected}
              >
                Unlock Existing
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-sync-provider-group">
        {conflicts.length > 0 && (
          <div className="settings-sync-conflict-warning-card" style={{ marginBottom: 'var(--settings-spacing-lg)' }}>
            <div className="conflict-warning-card-main">
              <span className="conflict-warning-icon-container">
                <IoAlertCircleOutline size={20} />
              </span>
              <div className="conflict-warning-card-copy">
                <Text variant="primary" className="conflict-warning-title">
                  Unresolved Sync Conflicts ({conflicts.length})
                </Text>
                <Text variant="secondary" className="conflict-warning-text">
                  Some modifications couldn't be automatically merged. Select which version to keep to prevent data loss.
                </Text>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConflictModalOpen(true)}
              style={{
                borderColor: 'var(--status-warning)',
                color: 'var(--text-primary)',
                backgroundColor: 'color-mix(in srgb, var(--status-warning) 8%, var(--bg-primary))',
              }}
            >
              Resolve Conflicts
            </Button>
          </div>
        )}

        <div className="settings-sync-provider-list">
          {visibleProfiles.map((profile) => {
            const connection = providerConnections[profile.provider];
            const isConnected = connection?.connected ?? false;
            const isConnecting = connectingProvider === profile.provider;
            const isConfigured = isOAuthConfigured(profile.provider);
            const rowStatus = isConnected ? 'Connected' : isConfigured ? 'Not connected' : 'Setup needed';

            return (
              <div
                key={profile.provider}
                className="settings-sync-provider-row"
              >
                <div className="settings-sync-provider-row__main">
                  <span className="settings-sync-provider__icon" aria-hidden="true">
                    {providerIcon(profile.provider)}
                  </span>
                  <span className="settings-sync-provider__label">{profile.label}</span>
                </div>
                <div className="settings-sync-provider-row__meta">
                  <span className={`settings-sync-provider-status${isConnected ? ' settings-sync-provider-status--connected' : ''}`}>
                    {isConnecting ? 'Connecting...' : rowStatus}
                  </span>
                  {isConnected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<IoTrashOutline size={14} />}
                      onClick={() => { void disconnect(profile.provider); }}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={isConnecting ? <Spinner size="sm" /> : <IoLogInOutline size={14} />}
                      onClick={() => { void handleConnectProvider(profile.provider); }}
                      disabled={!isConfigured || connectingProvider !== null}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Text variant="secondary" className="settings-sync-provider-note">
          {providerNote}
        </Text>
      </div>

      <div className="settings-sync-panel">
        <div className="settings-sync-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={status === 'syncing' ? <Spinner size="sm" /> : <IoRefresh size={14} />}
            onClick={handleSyncNow}
            disabled={!canSync}
          >
            {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
          <span className="settings-sync-last">Last synced: {formatSyncTime(settings?.lastSyncedAt)}</span>
        </div>

        {progress && (
          <div className="settings-sync-progress">
            <div className="settings-progress-container">
              <div
                className="settings-progress-bar"
                style={{ width: syncProgressWidth(progress) }}
              />
            </div>
            <div className="settings-progress-row">
              <span className="settings-progress-text">{progress.message}</span>
              {progress.total > 0 && (
                <span className="settings-progress-text">{progress.current}/{progress.total}</span>
              )}
            </div>
          </div>
        )}

        {message && status !== 'disconnected' && (
          <StatusMessage variant={status === 'error' ? 'error' : 'warning'}>{message}</StatusMessage>
        )}
        {actionError && <StatusMessage variant="error">{actionError}</StatusMessage>}
        {summary?.status === 'success' && (
          <StatusMessage variant={summary.conflicts > 0 ? 'warning' : 'success'}>
            {(() => {
              const notes = (summary.pulledNotes ?? 0) + (summary.pushedNotes ?? 0);
              const entries = (summary.pulledEntries ?? 0) + (summary.pushedEntries ?? 0);
              const todos = (summary.pulledTodos ?? 0) + (summary.pushedTodos ?? 0);

              if (notes === 0 && entries === 0 && todos === 0) {
                return 'Sync completed. All files are up to date.';
              }

              const parts: string[] = [];
              if (notes > 0) {
                parts.push(`${notes} sticky note${notes !== 1 ? 's' : ''}`);
              }
              if (entries > 0) {
                parts.push(`${entries} journal entr${entries !== 1 ? 'ies' : 'y'}`);
              }
              if (todos > 0) {
                parts.push(`${todos} todo${todos !== 1 ? 's' : ''}`);
              }

              const listStr = parts.length === 1
                ? parts[0]
                : parts.length === 2
                  ? `${parts[0]} and ${parts[1]}`
                  : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;

              const conflictStr = summary.conflicts > 0
                ? ` (${summary.conflicts} conflict${summary.conflicts !== 1 ? 's' : ''} saved)`
                : '';

              return `Synced: ${listStr}.${conflictStr}`;
            })()}
          </StatusMessage>
        )}
      </div>
      <ConflictResolutionModal isOpen={isConflictModalOpen} onClose={() => setIsConflictModalOpen(false)} />
    </div>
  );
}
