import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  DEFAULT_UPDATE_INSTALL_ACTION,
  DEFAULT_UPDATE_INSTALLATION_INFO,
  getUpdateInstallationInfo,
  resolveUpdateInstallAction,
  type UpdateInstallAction,
  type UpdateInstallationInfo,
} from '../lib/updateInstall';

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
  installationInfo: UpdateInstallationInfo;
  updateAction: UpdateInstallAction;
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
  installationInfo: DEFAULT_UPDATE_INSTALLATION_INFO,
  updateAction: DEFAULT_UPDATE_INSTALL_ACTION,
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
  const [installationInfo, setInstallationInfo] = useState<UpdateInstallationInfo>(
    DEFAULT_UPDATE_INSTALLATION_INFO
  );
  const updateRef = useRef<Update | null>(null);

  const refreshInstallationInfo = useCallback(async () => {
    const info = await getUpdateInstallationInfo();
    setInstallationInfo(info);
    return info;
  }, []);

  const updateAction = useMemo(
    () => resolveUpdateInstallAction(installationInfo, updateInfo?.version),
    [installationInfo, updateInfo?.version]
  );

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const info = await refreshInstallationInfo();
      const update = await check(info.updaterTarget ? { target: info.updaterTarget } : undefined);
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
  }, [refreshInstallationInfo]);

  const downloadUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setError(null);
    try {
      const refreshedInstallationInfo = await refreshInstallationInfo();
      const action = resolveUpdateInstallAction(refreshedInstallationInfo, update.version);

      if (action.kind === 'external-download') {
        await openUrl(action.url);
        return;
      }

      setDownloading(true);
      await update.downloadAndInstall();
      setDownloading(false);
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDownloading(false);
    }
  }, [refreshInstallationInfo]);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  useEffect(() => {
    refreshInstallationInfo();
    const timeout = setTimeout(checkForUpdate, CHECK_DELAY_MS);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [checkForUpdate, refreshInstallationInfo]);

  return (
    <UpdateContext.Provider
      value={{
        updateAvailable,
        updateInfo,
        checking,
        downloading,
        downloaded,
        error,
        installationInfo,
        updateAction,
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
