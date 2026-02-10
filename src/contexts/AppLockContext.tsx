import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  changeAppLockPassphrase,
  configureAppLock,
  disableAppLock,
  getAppLockStatus,
  lockApp,
  unlockAppLock,
} from '../lib/appLock';
import { closeDatabaseConnection } from '../lib/db';
import { appStore, STORE_KEYS } from '../lib/store';

const LOCK_TIMEOUT_OPTIONS = new Set([0, 60, 300]);
const DEFAULT_LOCK_TIMEOUT_SECONDS = 300;
const APP_LOCK_REQUIRED_EVENT = 'app-lock-required';

interface AppLockContextType {
  isReady: boolean;
  configured: boolean;
  unlocked: boolean;
  isLocked: boolean;
  lockTimeoutSeconds: number;
  refreshStatus: () => Promise<void>;
  configure: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  lockNow: () => Promise<void>;
  disable: (passphrase: string) => Promise<void>;
  changePassphrase: (currentPassphrase: string, newPassphrase: string) => Promise<void>;
  setLockTimeout: (seconds: number) => Promise<void>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

function normalizeTimeout(value: number | null): number {
  if (value !== null && LOCK_TIMEOUT_OPTIONS.has(value)) {
    return value;
  }
  return DEFAULT_LOCK_TIMEOUT_SECONDS;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [lockTimeoutSeconds, setLockTimeoutSeconds] = useState(0);
  const pendingLockTimerRef = useRef<number | null>(null);

  const clearPendingLock = useCallback(() => {
    if (pendingLockTimerRef.current !== null) {
      window.clearTimeout(pendingLockTimerRef.current);
      pendingLockTimerRef.current = null;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const [status, timeoutSetting] = await Promise.all([
      getAppLockStatus(),
      appStore.get<number>(STORE_KEYS.SECURITY_LOCK_TIMEOUT_SECONDS),
    ]);

    setConfigured(status.configured);
    setUnlocked(status.unlocked);
    setLockTimeoutSeconds(normalizeTimeout(timeoutSetting));

    if (!status.unlocked) {
      clearPendingLock();
      try {
        await closeDatabaseConnection();
      } catch (error) {
        console.error('Failed to close database while refreshing app lock status:', error);
      }
    }
  }, [clearPendingLock]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        await refreshStatus();
      } catch (error) {
        console.error('Failed to initialize app lock status:', error);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      clearPendingLock();
    };
  }, [clearPendingLock, refreshStatus]);

  useEffect(() => {
    const syncStatus = () => {
      void refreshStatus().catch((error) => {
        console.error('Failed to refresh app lock status after window resume:', error);
      });
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncStatus();
      }
    };

    window.addEventListener('focus', syncStatus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncStatus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshStatus]);

  useEffect(() => {
    const onAppLockRequired = () => {
      clearPendingLock();
      setConfigured(true);
      setUnlocked(false);

      void closeDatabaseConnection().catch((error) => {
        console.error('Failed to close database after lock-required event:', error);
      });

      void refreshStatus().catch((error) => {
        console.error('Failed to refresh lock status after lock-required event:', error);
      });
    };

    window.addEventListener(APP_LOCK_REQUIRED_EVENT, onAppLockRequired);

    return () => {
      window.removeEventListener(APP_LOCK_REQUIRED_EVENT, onAppLockRequired);
    };
  }, [clearPendingLock, refreshStatus]);

  const configure = useCallback(async (passphrase: string) => {
    await configureAppLock(passphrase);
    setConfigured(true);
    setUnlocked(true);
  }, []);

  const unlock = useCallback(async (passphrase: string) => {
    const ok = await unlockAppLock(passphrase);
    setUnlocked(ok);
    return ok;
  }, []);

  const lockNow = useCallback(async () => {
    clearPendingLock();
    setUnlocked(false);
    try {
      await closeDatabaseConnection();
    } catch (error) {
      console.error('Failed to close database before lock:', error);
    }

    try {
      await lockApp();
    } catch (error) {
      setUnlocked(true);
      throw error;
    }
  }, [clearPendingLock]);

  const disable = useCallback(async (passphrase: string) => {
    await disableAppLock(passphrase);
    clearPendingLock();
    setConfigured(false);
    setUnlocked(true);
  }, [clearPendingLock]);

  const changePassphrase = useCallback(async (currentPassphrase: string, newPassphrase: string) => {
    await changeAppLockPassphrase(currentPassphrase, newPassphrase);
    setConfigured(true);
    setUnlocked(true);
  }, []);

  const setLockTimeout = useCallback(async (seconds: number) => {
    const normalized = normalizeTimeout(seconds);
    await appStore.set(STORE_KEYS.SECURITY_LOCK_TIMEOUT_SECONDS, normalized);
    setLockTimeoutSeconds(normalized);
  }, []);

  useEffect(() => {
    if (!configured || !unlocked) {
      clearPendingLock();
      return;
    }

    const scheduleLock = () => {
      if (lockTimeoutSeconds === 0) {
        void lockNow().catch((error) => {
          console.error('Failed to lock app after background event:', error);
        });
        return;
      }

      clearPendingLock();
      pendingLockTimerRef.current = window.setTimeout(() => {
        pendingLockTimerRef.current = null;
        void lockNow().catch((error) => {
          console.error('Failed to lock app after timeout:', error);
        });
      }, lockTimeoutSeconds * 1000);
    };

    const cancelScheduledLock = () => {
      clearPendingLock();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        scheduleLock();
      } else {
        cancelScheduledLock();
      }
    };

    const onBlur = () => {
      scheduleLock();
    };

    const onFocus = () => {
      cancelScheduledLock();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      cancelScheduledLock();
    };
  }, [clearPendingLock, configured, lockNow, lockTimeoutSeconds, unlocked]);

  const value = useMemo(
    () => ({
      isReady,
      configured,
      unlocked,
      isLocked: configured && !unlocked,
      lockTimeoutSeconds,
      refreshStatus,
      configure,
      unlock,
      lockNow,
      disable,
      changePassphrase,
      setLockTimeout,
    }),
    [
      isReady,
      configured,
      unlocked,
      lockTimeoutSeconds,
      refreshStatus,
      configure,
      unlock,
      lockNow,
      disable,
      changePassphrase,
      setLockTimeout,
    ],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within AppLockProvider');
  }
  return context;
}
