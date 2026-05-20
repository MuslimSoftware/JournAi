import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import type {
  SyncConnectionStatus,
  SyncProgress,
  SyncKeyset,
  SyncProvider,
  SyncProviderProfile,
  SyncSettings,
  SyncSummary,
} from '../types/sync';
import {
  clearSyncSecrets,
  configureSyncKey,
  connectProviderWithOAuth,
  createSyncConnector,
  deleteProviderAuth,
  getAvailableProviderProfiles,
  getProviderAuth,
  getProviderProfile,
  getRemoteSyncKeyset,
  getStoredSyncKeyset,
  getSyncSettings,
  hasRawSyncKey,
  setSyncEnabled,
  setSyncProvider,
  syncNow,
  unlockStoredSyncKey,
  getPendingConflicts,
  resolveConflict as dbResolveConflict,
  type SyncConflictRow,
} from '../services/sync';

interface ProviderConnectionState {
  provider: SyncProvider;
  accountLabel: string | null;
  connected: boolean;
  status: SyncConnectionStatus;
  message: string | null;
}

type SyncKeySetupState = 'needs_key' | 'ready' | 'remote_unlock_required' | 'mismatch';

interface SyncContextType {
  settings: SyncSettings | null;
  provider: SyncProvider | null;
  providerLabel: string;
  accountLabel: string | null;
  availableProviders: SyncProviderProfile[];
  providerConnections: Partial<Record<SyncProvider, ProviderConnectionState>>;
  connected: boolean;
  hasSyncKey: boolean;
  keySetupState: SyncKeySetupState;
  keySetupMessage: string | null;
  status: SyncConnectionStatus;
  message: string | null;
  progress: SyncProgress | null;
  summary: SyncSummary | null;
  loading: boolean;
  conflicts: SyncConflictRow[];
  canSync: boolean;
  refresh: () => Promise<void>;
  chooseProvider: (provider: SyncProvider) => Promise<void>;
  toggleEnabled: (enabled: boolean) => Promise<void>;
  connectProvider: (provider: SyncProvider) => Promise<void>;
  disconnect: (provider?: SyncProvider) => Promise<void>;
  resetSyncSecrets: () => Promise<void>;
  createKey: (passphrase: string) => Promise<void>;
  unlockKey: (passphrase: string) => Promise<void>;
  runSync: () => Promise<SyncSummary>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

function remoteUnlockRequiredMessage(label: string): string {
  return `${label} already has encrypted sync data. Enter its existing passphrase and choose Unlock Existing before creating a new passphrase.`;
}

function keysetMismatchMessage(label: string): string {
  return `${label} already has a different sync passphrase. Reset sync on this device or unlock the existing cloud passphrase before syncing.`;
}

function syncKeysetsMatch(local: SyncKeyset, remote: SyncKeyset): boolean {
  return local.schemaVersion === remote.schemaVersion
    && local.algorithm === remote.algorithm
    && local.kdf === remote.kdf
    && local.iterations === remote.iterations
    && local.saltB64 === remote.saltB64
    && local.wrappedKeyB64 === remote.wrappedKeyB64
    && local.ivB64 === remote.ivB64
    && local.createdAt === remote.createdAt;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [provider, setProviderState] = useState<SyncProvider | null>(null);
  const [providerLabel, setProviderLabel] = useState('');
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<SyncProviderProfile[]>([]);
  const [providerConnections, setProviderConnections] = useState<Partial<Record<SyncProvider, ProviderConnectionState>>>({});
  const [connected, setConnected] = useState(false);
  const [hasSyncKey, setHasSyncKey] = useState(false);
  const [keySetupState, setKeySetupState] = useState<SyncKeySetupState>('needs_key');
  const [keySetupMessage, setKeySetupMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncConnectionStatus>('disabled');
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflictRow[]>([]);
  const [loading, setLoading] = useState(true);

  const debounceTimerRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);
  const startupSyncExecutedRef = useRef(false);

  const refreshConflicts = useCallback(async () => {
    try {
      const pending = await getPendingConflicts();
      setConflicts(pending);
    } catch (error) {
      console.error('[SyncContext] Failed to load pending conflicts:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const syncSettings = await getSyncSettings();
      const activeProvider = syncSettings.provider;
      const keyAvailable = await hasRawSyncKey();
      const profiles = await getAvailableProviderProfiles();

      const connections: Partial<Record<SyncProvider, ProviderConnectionState>> = {};
      await Promise.all(
        profiles.map(async (profile) => {
          try {
            const connectorStatus = await createSyncConnector(profile.provider).getStatus();
            const auth = await getProviderAuth(profile.provider);
            connections[profile.provider] = {
              provider: profile.provider,
              accountLabel: auth?.accountLabel ?? null,
              connected: Boolean(auth?.accessToken) && connectorStatus.status === 'connected',
              status: connectorStatus.status,
              message: connectorStatus.message,
            };
          } catch (err) {
            connections[profile.provider] = {
              provider: profile.provider,
              accountLabel: null,
              connected: false,
              status: 'error',
              message: err instanceof Error ? err.message : 'Connection failed.',
            };
          }
        })
      );

      const activeConnection = activeProvider ? connections[activeProvider] : null;
      const connectorStatus = activeProvider
        ? activeConnection ?? await createSyncConnector(activeProvider).getStatus()
        : { status: 'disconnected' as const, message: 'Choose a sync provider first.' };
      const label = activeProvider ? getProviderProfile(activeProvider).label : '';
      const activeConnected = activeConnection?.connected ?? false;
      let nextKeySetupState: SyncKeySetupState = keyAvailable ? 'ready' : 'needs_key';
      let nextKeySetupMessage: string | null = null;

      if (activeProvider && activeConnected) {
        const [localKeyset, remoteKeyset] = await Promise.all([
          getStoredSyncKeyset(),
          getRemoteSyncKeyset(),
        ]);

        if (remoteKeyset && !keyAvailable) {
          nextKeySetupState = 'remote_unlock_required';
          nextKeySetupMessage = remoteUnlockRequiredMessage(label);
        } else if (remoteKeyset && localKeyset && !syncKeysetsMatch(localKeyset, remoteKeyset)) {
          nextKeySetupState = 'mismatch';
          nextKeySetupMessage = keysetMismatchMessage(label);
        }
      }

      setSettings(syncSettings);
      setProviderState(activeProvider);
      setProviderLabel(label);
      setAccountLabel(activeConnection?.accountLabel ?? null);
      setAvailableProviders(profiles);
      setProviderConnections(connections);
      setConnected(activeConnected);
      setHasSyncKey(keyAvailable);
      setKeySetupState(nextKeySetupState);
      setKeySetupMessage(nextKeySetupMessage);

      // Keep status as 'syncing' if it's currently syncing in the background
      if (!isSyncingRef.current) {
        if (nextKeySetupState === 'mismatch') {
          setStatus('error');
          setMessage(nextKeySetupMessage);
        } else if (nextKeySetupState === 'remote_unlock_required') {
          setStatus('needs_configuration');
          setMessage(nextKeySetupMessage);
        } else {
          setStatus(connectorStatus.status);
          setMessage(connectorStatus.message);
        }
      }

      await refreshConflicts();
    } catch (error) {
      console.error('[SyncContext] Failed to refresh sync settings:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshConflicts]);

  const runSync = useCallback(async (): Promise<SyncSummary> => {
    if (isSyncingRef.current) {
      return {
        status: 'syncing',
        message: 'Sync is already running.',
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        lastSyncedAt: settings?.lastSyncedAt ?? null,
      };
    }

    const syncSettings = await getSyncSettings();
    if (syncSettings.provider) {
      const label = getProviderProfile(syncSettings.provider).label;
      const connectorStatus = await createSyncConnector(syncSettings.provider).getStatus();
      if (connectorStatus.status === 'connected') {
        const [localKeyset, remoteKeyset] = await Promise.all([
          getStoredSyncKeyset(),
          getRemoteSyncKeyset(),
        ]);

        if (remoteKeyset && !localKeyset) {
          const nextMessage = remoteUnlockRequiredMessage(label);
          setKeySetupState('remote_unlock_required');
          setKeySetupMessage(nextMessage);
          setStatus('needs_configuration');
          setMessage(nextMessage);
          throw new Error(nextMessage);
        }

        if (remoteKeyset && localKeyset && !syncKeysetsMatch(localKeyset, remoteKeyset)) {
          const nextMessage = keysetMismatchMessage(label);
          setKeySetupState('mismatch');
          setKeySetupMessage(nextMessage);
          setStatus('error');
          setMessage(nextMessage);
          throw new Error(nextMessage);
        }
      }
    }

    isSyncingRef.current = true;
    setStatus('syncing');
    setMessage(null);
    setSummary(null);
    setProgress({
      phase: 'preparing',
      message: 'Preparing encrypted sync...',
      current: 0,
      total: 0,
    });

    try {
      const syncSummary = await syncNow((syncProgress) => {
        setProgress(syncProgress);
      });

      setSummary(syncSummary);
      setStatus(syncSummary.status);
      setMessage(syncSummary.message);
      setProgress(null);

      // Update settings and conflicts after sync completes
      await refresh();

      return syncSummary;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Sync failed.';
      setStatus('error');
      setMessage(errMsg);
      setProgress(null);

      // Refresh to ensure we have the latest local/remote connection status
      await refresh();

      throw error;
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings?.lastSyncedAt, refresh]);

  const chooseProvider = useCallback(async (nextProvider: SyncProvider) => {
    await setSyncProvider(nextProvider);
    await refresh();
  }, [refresh]);

  const toggleEnabled = useCallback(async (enabled: boolean) => {
    await setSyncEnabled(enabled);
    await refresh();
  }, [refresh]);

  const connectProvider = useCallback(async (nextProvider: SyncProvider) => {
    await connectProviderWithOAuth(nextProvider);
    await setSyncProvider(nextProvider);
    await setSyncEnabled(true);
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(async (nextProvider?: SyncProvider) => {
    const providerToDisconnect = nextProvider ?? provider;
    if (providerToDisconnect) {
      await deleteProviderAuth(providerToDisconnect);
      if (providerToDisconnect === provider) {
        await setSyncEnabled(false);
      }
    }
    await refresh();
  }, [refresh, provider]);

  const resetSyncSecrets = useCallback(async () => {
    await clearSyncSecrets(provider);
    await refresh();
  }, [refresh, provider]);

  const createKey = useCallback(async (passphrase: string) => {
    const syncSettings = await getSyncSettings();
    if (syncSettings.provider) {
      const label = getProviderProfile(syncSettings.provider).label;
      const connectorStatus = await createSyncConnector(syncSettings.provider).getStatus();
      if (connectorStatus.status === 'connected') {
        const remoteKeyset = await getRemoteSyncKeyset();
        if (remoteKeyset) {
          const nextMessage = remoteUnlockRequiredMessage(label);
          setKeySetupState('remote_unlock_required');
          setKeySetupMessage(nextMessage);
          setStatus('needs_configuration');
          setMessage(nextMessage);
          throw new Error(nextMessage);
        }
      }
    }

    await configureSyncKey(passphrase);
    await refresh();
  }, [refresh]);

  const unlockKey = useCallback(async (passphrase: string) => {
    const [localKeyset, remoteKeyset] = await Promise.all([
      getStoredSyncKeyset(),
      getRemoteSyncKeyset(),
    ]);
    const keysetToUnlock = remoteKeyset ?? localKeyset;
    if (!keysetToUnlock) {
      throw new Error('No sync keyset was found for this provider.');
    }
    await unlockStoredSyncKey(passphrase, keysetToUnlock);
    await refresh();
  }, [refresh]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote') => {
    await dbResolveConflict(conflictId, resolution);
    await refreshConflicts();
    // After resolving, immediately trigger a background sync to propagate changes
    void runSync().catch((err) => console.error('[SyncContext] Auto-sync post conflict resolution failed:', err));
  }, [refreshConflicts, runSync]);

  const canSync = useMemo(() => {
    return Boolean(provider && connected && hasSyncKey && keySetupState === 'ready' && !isSyncingRef.current);
  }, [connected, hasSyncKey, keySetupState, provider]);

  // Handle Initial Load
  useEffect(() => {
    if (startupSyncExecutedRef.current) {
      return;
    }
    startupSyncExecutedRef.current = true;

    let isSubscribed = true;

    void refresh().then(() => {
      if (!isSubscribed) return;
      // Auto sync on mount if settings permit
      const autoSyncStartup = async () => {
        const syncSettings = await getSyncSettings();
        if (!isSubscribed) return;
        const keyAvailable = await hasRawSyncKey();
        if (!isSubscribed) return;
        if (syncSettings.provider && syncSettings.enabled && keyAvailable) {
          try {
            const connector = createSyncConnector(syncSettings.provider);
            const connStatus = await connector.getStatus();
            if (!isSubscribed) return;
            if (connStatus.status === 'connected') {
              console.log('[SyncContext] Auto-sync on startup started...');
              await runSync();
            }
          } catch (err) {
            console.error('[SyncContext] Startup auto-sync failed:', err);
          }
        }
      };
      void autoSyncStartup();
    });

    return () => {
      isSubscribed = false;
    };
  }, [refresh, runSync]);

  // Effect: Listen to local database changes for debounced sync
  useEffect(() => {
    const handleDirtyRecord = async () => {
      const syncSettings = await getSyncSettings();
      const keyAvailable = await hasRawSyncKey();
      if (!syncSettings.provider || !syncSettings.enabled || !keyAvailable) {
        return; // Auto-sync not configured/enabled
      }

      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        console.log('[SyncContext] Auto-sync triggered by local database changes...');
        void runSync().catch((err) => {
          console.error('[SyncContext] Auto-sync failed:', err);
        });
      }, 15000); // 15s debounce
    };

    const handleConflictsChanged = () => {
      void refreshConflicts();
    };

    window.addEventListener('sync:dirty-record', handleDirtyRecord);
    window.addEventListener('sync:conflicts-changed', handleConflictsChanged);

    return () => {
      window.removeEventListener('sync:dirty-record', handleDirtyRecord);
      window.removeEventListener('sync:conflicts-changed', handleConflictsChanged);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [runSync, refreshConflicts]);

  // Effect: Periodic Background Sync every 10 minutes
  useEffect(() => {
    const interval = window.setInterval(async () => {
      const syncSettings = await getSyncSettings();
      const keyAvailable = await hasRawSyncKey();
      if (syncSettings.provider && syncSettings.enabled && keyAvailable) {
        console.log('[SyncContext] Periodic background auto-sync triggered...');
        void runSync().catch((err) => {
          console.error('[SyncContext] Periodic auto-sync failed:', err);
        });
      }
    }, 600000); // 10 minutes

    return () => {
      window.clearInterval(interval);
    };
  }, [runSync]);

  const value = useMemo(
    () => ({
      settings,
      provider,
      providerLabel,
      accountLabel,
      availableProviders,
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
      conflicts,
      canSync,
      refresh,
      chooseProvider,
      toggleEnabled,
      connectProvider,
      disconnect,
      resetSyncSecrets,
      createKey,
      unlockKey,
      runSync,
      resolveConflict,
    }),
    [
      settings,
      provider,
      providerLabel,
      accountLabel,
      availableProviders,
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
      conflicts,
      canSync,
      refresh,
      chooseProvider,
      toggleEnabled,
      connectProvider,
      disconnect,
      resetSyncSecrets,
      createKey,
      unlockKey,
      runSync,
      resolveConflict,
    ]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
