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
  downloadProgress: number;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

const defaults: UpdateContextType = {
  updateAvailable: false,
  updateInfo: null,
  checking: false,
  downloading: false,
  downloadProgress: 0,
  error: null,
  checkForUpdate: async () => {},
  installUpdate: async () => {},
  dismissUpdate: () => {},
};

const UpdateContext = createContext<UpdateContextType>(defaults);

const CHECK_DELAY_MS = 3_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1_000;

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
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

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setDownloading(true);
    setDownloadProgress(0);
    setError(null);
    try {
      let totalBytes = 0;
      let downloadedBytes = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            setDownloadProgress(Math.round((downloadedBytes / totalBytes) * 100));
          }
        } else if (event.event === 'Finished') {
          setDownloadProgress(100);
        }
      });
      await relaunch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDownloading(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    setUpdateInfo(null);
    updateRef.current = null;
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
        downloadProgress,
        error,
        checkForUpdate,
        installUpdate,
        dismissUpdate,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  return useContext(UpdateContext);
}
