import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  body: string;
}

interface UpdateContextType {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  checking: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  restartApp: () => Promise<void>;
}

const defaults: UpdateContextType = {
  updateAvailable: false,
  updateInfo: null,
  checking: false,
  downloading: false,
  downloaded: false,
  error: null,
  checkForUpdate: async () => {},
  downloadUpdate: async () => {},
  restartApp: async () => {},
};

const UpdateContext = createContext<UpdateContextType>(defaults);

const CHECK_DELAY_MS = 3_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1_000;

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setUpdateAvailable(true);
        setUpdateInfo({ version: update.version, body: update.body ?? '' });
      } else {
        updateRef.current = null;
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setDownloading(true);
    setError(null);
    try {
      await update.downloadAndInstall();
      setDownloading(false);
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDownloading(false);
    }
  }, []);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(checkForUpdate, CHECK_DELAY_MS);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  return (
    <UpdateContext.Provider
      value={{
        updateAvailable,
        updateInfo,
        checking,
        downloading,
        downloaded,
        error,
        checkForUpdate,
        downloadUpdate,
        restartApp,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  return useContext(UpdateContext);
}
