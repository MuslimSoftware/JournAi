import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { dlog, derr } from '../lib/devLog';
import type {
  SyncConnectionStatus,
  SyncProgress,
  SyncSettings,
  SyncSummary,
} from '../types/sync';
import {
  clearSyncSecrets,
  connectProviderWithOAuth,
  createSyncConnector,
  deleteProviderAuth,
  deleteAllRemoteData,
  downloadRemoteKey,
  generateAndStoreKey,
  getProviderAuth,
  getSyncSettings,
  hasRawSyncKey,
  resetAllSyncStates,
  setSyncEnabled,
  storeRawSyncKey,
  syncNow,
  getPendingConflicts,
  resolveConflict as dbResolveConflict,
  type SyncConflictRow,
} from '../services/sync';

interface SyncContextType {
  settings: SyncSettings | null;
  connected: boolean;
  hasSyncKey: boolean;
  status: SyncConnectionStatus;
  message: string | null;
  progress: SyncProgress | null;
  summary: SyncSummary | null;
  loading: boolean;
  conflicts: SyncConflictRow[];
  canSync: boolean;
  refresh: () => Promise<void>;
  connectProvider: () => Promise<void>;
  disconnect: () => Promise<void>;
  resetSyncSecrets: () => Promise<void>;
  resetRemoteData: () => Promise<void>;
  runSync: () => Promise<SyncSummary>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasSyncKey, setHasSyncKey] = useState(false);
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
      derr('[SyncContext] Failed to load pending conflicts:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      dlog('[sync:context] refresh start');
      const syncSettings = await getSyncSettings();
      const keyAvailable = await hasRawSyncKey();
      dlog('[sync:context] refresh keyAvailable =>', keyAvailable);

      const connector = createSyncConnector();
      let connectorStatus;
      try {
        connectorStatus = await connector.getStatus();
      } catch (err) {
        connectorStatus = { status: 'error' as const, message: err instanceof Error ? err.message : 'Connection failed.' };
      }

      const isConnected = Boolean(await getProviderAuth('google_drive').then(a => a?.accessToken)) && connectorStatus.status === 'connected';
      dlog('[sync:context] refresh isConnected =>', isConnected, 'connectorStatus =>', JSON.stringify(connectorStatus));

      if (isConnected && !keyAvailable) {
        dlog('[sync:context] refresh connected but no key — auto-setup starting...');
        try {
          const remoteKeyB64 = await downloadRemoteKey();
          if (remoteKeyB64) {
            dlog('[sync:context] refresh found remote key — storing locally');
            await storeRawSyncKey(remoteKeyB64);
          } else {
            dlog('[sync:context] refresh no remote key — generating new one');
            await generateAndStoreKey();
          }
        } catch (keyErr) {
          derr('[sync:context] refresh auto-key-setup failed:', keyErr);
        }
      }

      const keyAvailableAfterSetup = await hasRawSyncKey();

      setSettings(syncSettings);
      setConnected(isConnected);
      setHasSyncKey(keyAvailableAfterSetup);

      if (!isSyncingRef.current) {
        setStatus(connectorStatus.status);
        setMessage(connectorStatus.message);
      }

      await refreshConflicts();
    } catch (error) {
      derr('[SyncContext] Failed to refresh sync settings:', error);
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

      await refresh();

      return syncSummary;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Sync failed.';
      derr('[sync:context] runSync error =>', errMsg);
      setStatus('error');
      setMessage(errMsg);
      setProgress(null);

      await refresh();

      throw error;
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings?.lastSyncedAt, refresh]);

  const connectProvider = useCallback(async () => {
    dlog('[sync:context] connectProvider start');
    await connectProviderWithOAuth('google_drive');
    dlog('[sync:context] connectProvider OAuth done, enabling sync...');
    await setSyncEnabled(true);
    setConnected(true);
    dlog('[sync:context] connectProvider calling refresh...');
    await refresh();
    dlog('[sync:context] connectProvider refresh done');
  }, [refresh]);

  const disconnect = useCallback(async () => {
    await deleteProviderAuth('google_drive');
    await setSyncEnabled(false);
    await refresh();
  }, [refresh]);

  const resetSyncSecrets = useCallback(async () => {
    await clearSyncSecrets('google_drive');
    await refresh();
  }, [refresh]);

  const resetRemoteData = useCallback(async () => {
    dlog('[sync:context] resetRemoteData start');
    await deleteAllRemoteData();
    await resetAllSyncStates();
    await clearSyncSecrets();
    await refresh();
    dlog('[sync:context] resetRemoteData done');
  }, [refresh]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote') => {
    await dbResolveConflict(conflictId, resolution);
    await refreshConflicts();
    void runSync().catch((err) => derr('[SyncContext] Auto-sync post conflict resolution failed:', err));
  }, [refreshConflicts, runSync]);

  const canSync = useMemo(() => {
    return Boolean(connected && hasSyncKey && !isSyncingRef.current);
  }, [connected, hasSyncKey]);

  useEffect(() => {
    if (startupSyncExecutedRef.current) {
      return;
    }
    startupSyncExecutedRef.current = true;

    let isSubscribed = true;

    void refresh().then(() => {
      if (!isSubscribed) return;
      const autoSyncStartup = async () => {
        const syncSettings = await getSyncSettings();
        if (!isSubscribed) return;
        const keyAvailable = await hasRawSyncKey();
        if (!isSubscribed) return;
        if (syncSettings.enabled && keyAvailable) {
          try {
            const connector = createSyncConnector();
            const connStatus = await connector.getStatus();
            if (!isSubscribed) return;
            if (connStatus.status === 'connected') {
              dlog('[SyncContext] Auto-sync on startup started...');
              await runSync();
            }
          } catch (err) {
            derr('[SyncContext] Startup auto-sync failed:', err);
          }
        }
      };
      void autoSyncStartup();
    });

    return () => {
      isSubscribed = false;
    };
  }, [refresh, runSync]);

  useEffect(() => {
    const handleDirtyRecord = async () => {
      const syncSettings = await getSyncSettings();
      const keyAvailable = await hasRawSyncKey();
      if (!syncSettings.enabled || !keyAvailable) {
        return;
      }

      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        dlog('[SyncContext] Auto-sync triggered by local database changes...');
        void runSync().catch((err) => {
          derr('[SyncContext] Auto-sync failed:', err);
        });
      }, 15000);
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

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const syncSettings = await getSyncSettings();
      const keyAvailable = await hasRawSyncKey();
      if (syncSettings.enabled && keyAvailable) {
        dlog('[SyncContext] Periodic background auto-sync triggered...');
        void runSync().catch((err) => {
          derr('[SyncContext] Periodic auto-sync failed:', err);
        });
      }
    }, 600000);

    return () => {
      window.clearInterval(interval);
    };
  }, [runSync]);

  const value = useMemo(
    () => ({
      settings,
      connected,
      hasSyncKey,
      status,
      message,
      progress,
      summary,
      loading,
      conflicts,
      canSync,
      refresh,
      connectProvider,
      disconnect,
      resetSyncSecrets,
      resetRemoteData,
      runSync,
      resolveConflict,
    }),
    [
      settings,
      connected,
      hasSyncKey,
      status,
      message,
      progress,
      summary,
      loading,
      conflicts,
      canSync,
      refresh,
      connectProvider,
      disconnect,
      resetSyncSecrets,
      resetRemoteData,
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
