import { invoke } from '@tauri-apps/api/core';

export type AppPlatform = 'macos' | 'ios' | 'windows' | 'linux' | 'android' | 'unknown';

function detectBrowserPlatform(): AppPlatform {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';

  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  if (/Mac/.test(platform) || /Mac OS X/.test(userAgent)) {
    return 'macos';
  }

  if (/Android/.test(userAgent)) {
    return 'android';
  }

  if (/Win/.test(platform)) {
    return 'windows';
  }

  if (/Linux/.test(platform)) {
    return 'linux';
  }

  return 'unknown';
}

export async function getAppPlatform(): Promise<AppPlatform> {
  try {
    const platform = await invoke<AppPlatform>('app_platform');
    return platform;
  } catch {
    return detectBrowserPlatform();
  }
}

export async function isAppleSyncPlatform(): Promise<boolean> {
  const platform = await getAppPlatform();
  return platform === 'macos' || platform === 'ios';
}
