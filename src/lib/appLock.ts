import { invoke } from '@tauri-apps/api/core';

export interface AppLockStatus {
  configured: boolean;
  unlocked: boolean;
}

export async function getAppLockStatus(): Promise<AppLockStatus> {
  try {
    return await invoke<AppLockStatus>('app_lock_status');
  } catch {
    return { configured: false, unlocked: true };
  }
}

export async function configureAppLock(passphrase: string): Promise<void> {
  await invoke('app_lock_configure', { passphrase });
}

export async function unlockAppLock(passphrase: string): Promise<boolean> {
  return invoke<boolean>('app_lock_unlock', { passphrase });
}

export async function lockApp(): Promise<void> {
  await invoke('app_lock_lock');
}

export async function disableAppLock(passphrase: string): Promise<void> {
  await invoke('app_lock_disable', { passphrase });
}

export async function changeAppLockPassphrase(currentPassphrase: string, newPassphrase: string): Promise<void> {
  await invoke('app_lock_change_passphrase', { currentPassphrase, newPassphrase });
}
