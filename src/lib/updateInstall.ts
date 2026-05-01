import { invoke } from '@tauri-apps/api/core';

export const LINUX_DEB_DOWNLOAD_URL =
  'https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-Linux.deb';
export const LINUX_APPIMAGE_DOWNLOAD_URL =
  'https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-Linux.AppImage';
export const LINUX_RELEASES_URL = 'https://github.com/MuslimSoftware/JournAi/releases/latest';

export type UpdateBundleType =
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'app'
  | 'msi'
  | 'nsis'
  | 'other'
  | 'unknown';

export interface UpdateInstallationInfo {
  platform: 'linux' | 'other';
  bundleType: UpdateBundleType;
  updaterTarget: string | null;
  appImageCanSelfUpdate: boolean;
  appImagePath: string | null;
  appImageUpdateIssue: string | null;
}

export type UpdateInstallAction =
  | {
      kind: 'install';
      label: 'Download & Install';
      url: null;
      notice: null;
    }
  | {
      kind: 'external-download';
      label: 'Download Deb' | 'Download AppImage' | 'Open Release Page';
      url: string;
      notice: string;
    };

export const DEFAULT_UPDATE_INSTALLATION_INFO: UpdateInstallationInfo = {
  platform: 'other',
  bundleType: 'unknown',
  updaterTarget: null,
  appImageCanSelfUpdate: true,
  appImagePath: null,
  appImageUpdateIssue: null,
};

export const DEFAULT_UPDATE_INSTALL_ACTION: UpdateInstallAction = {
  kind: 'install',
  label: 'Download & Install',
  url: null,
  notice: null,
};

export async function getUpdateInstallationInfo(): Promise<UpdateInstallationInfo> {
  try {
    const info = await invoke<Partial<UpdateInstallationInfo>>('update_installation_info');

    return {
      platform: info.platform ?? DEFAULT_UPDATE_INSTALLATION_INFO.platform,
      bundleType: info.bundleType ?? DEFAULT_UPDATE_INSTALLATION_INFO.bundleType,
      updaterTarget: info.updaterTarget ?? null,
      appImageCanSelfUpdate:
        info.appImageCanSelfUpdate ?? DEFAULT_UPDATE_INSTALLATION_INFO.appImageCanSelfUpdate,
      appImagePath: info.appImagePath ?? null,
      appImageUpdateIssue: info.appImageUpdateIssue ?? null,
    };
  } catch {
    return DEFAULT_UPDATE_INSTALLATION_INFO;
  }
}

export function resolveUpdateInstallAction(
  info: UpdateInstallationInfo,
  version?: string
): UpdateInstallAction {
  if (info.platform !== 'linux') {
    return DEFAULT_UPDATE_INSTALL_ACTION;
  }

  const versionLabel = version ? `v${version}` : 'the latest version';

  if (info.bundleType === 'deb') {
    return {
      kind: 'external-download',
      label: 'Download Deb',
      url: LINUX_DEB_DOWNLOAD_URL,
      notice: `Deb installs are updated through the system package installer. Download ${versionLabel}; your system may ask for admin permission.`,
    };
  }

  if (info.bundleType === 'appimage') {
    if (info.appImageCanSelfUpdate) {
      return DEFAULT_UPDATE_INSTALL_ACTION;
    }

    return {
      kind: 'external-download',
      label: 'Download AppImage',
      url: LINUX_APPIMAGE_DOWNLOAD_URL,
      notice:
        `${info.appImageUpdateIssue ?? 'This AppImage location is not writable.'} Download ${versionLabel} and replace the current AppImage manually.`,
    };
  }

  return {
    kind: 'external-download',
    label: 'Open Release Page',
    url: LINUX_RELEASES_URL,
    notice:
      'This Linux install type should be updated outside the app. Open the latest release and choose the package for your system.',
  };
}
