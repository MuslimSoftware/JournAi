import { useState, useRef } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
import {
  IoCloudOutline,
  IoLogoGoogle,
  IoRefresh,
  IoTrashOutline,
  IoLogInOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import { Button, Spinner, Text } from '../themed';
import StatusMessage from './StatusMessage';
import { useSync } from '../../hooks/useSync';
import { isOAuthConfigured } from '../../services/sync';
import type { SyncProgress } from '../../types/sync';
import ConflictResolutionModal from './ConflictResolutionModal';
import '../../styles/settings.css';

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

export default function SyncCard() {
  const {
    settings,
    connected,
    status,
    message,
    progress,
    summary,
    loading,
    canSync,
    connectProvider,
    disconnect,
    resetRemoteData,
    runSync,
    conflicts,
  } = useSync();

  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const resettingRef = useRef(false);

  const isConfigured = isOAuthConfigured('google_drive');

  const handleConnect = async () => {
    setActionError(null);
    setConnecting(true);
    try {
      await connectProvider();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    void disconnect();
  };

  const handleSyncNow = async () => {
    setActionError(null);
    try {
      await runSync();
    } catch {
      // useSync owns the visible sync failure state.
    }
  };

  const handleResetRemoteData = async () => {
    if (resettingRef.current) return;
    resettingRef.current = true;
    const confirmed = await confirm(
      'This will delete all encrypted files from Google Drive and re-upload everything on the next sync.',
      { title: 'Reset Cloud Data?', kind: 'warning' }
    );
    if (!confirmed) {
      resettingRef.current = false;
      return;
    }
    setResetting(true);
    setActionError(null);
    setResetDone(false);
    try {
      await resetRemoteData();
      setResetDone(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Reset failed.');
    } finally {
      resettingRef.current = false;
      setResetting(false);
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
              {status === 'syncing'
                ? progress?.message ?? 'Syncing encrypted data...'
                : connected
                  ? `${statusLabel(status)} with Google Drive`
                  : 'Connect Google Drive to sync'}
            </Text>
          </div>
        </div>
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
          <div className="settings-sync-provider-row">
            <div className="settings-sync-provider-row__main">
              <span className="settings-sync-provider__icon" aria-hidden="true">
                <IoLogoGoogle size={16} />
              </span>
              <span className="settings-sync-provider__label">Google Drive</span>
            </div>
            <div className="settings-sync-provider-row__meta">
              <span className={`settings-sync-provider-status${connected ? ' settings-sync-provider-status--connected' : ''}`}>
                {connecting ? 'Connecting...' : connected ? 'Connected' : isConfigured ? 'Not connected' : 'Setup needed'}
              </span>
              {connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<IoTrashOutline size={14} />}
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={connecting ? <Spinner size="sm" /> : <IoLogInOutline size={14} />}
                  onClick={() => { void handleConnect(); }}
                  disabled={!isConfigured || connecting}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-sync-panel">
        <div className="settings-sync-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={status === 'syncing' ? <Spinner size="sm" /> : <IoRefresh size={14} />}
            onClick={() => { void handleSyncNow(); }}
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

        {connected && (
          <div style={{ marginTop: 'var(--settings-spacing-lg)' }}>
            <Button
              variant="danger"
              size="sm"
              icon={<IoTrashOutline size={14} />}
              onClick={() => { void handleResetRemoteData(); }}
              disabled={resetting}
            >
              Reset Cloud Data
            </Button>
            {resetting && (
              <div style={{ marginTop: 'var(--settings-spacing-sm)' }}>
                <StatusMessage variant="warning">Deleting cloud data...</StatusMessage>
              </div>
            )}
            {resetDone && (
              <div style={{ marginTop: 'var(--settings-spacing-sm)' }}>
                <StatusMessage variant="success">Cloud data cleared. All records will be re-uploaded on the next sync.</StatusMessage>
              </div>
            )}
          </div>
        )}
      </div>

      <ConflictResolutionModal isOpen={isConflictModalOpen} onClose={() => setIsConflictModalOpen(false)} />
    </div>
  );
}
