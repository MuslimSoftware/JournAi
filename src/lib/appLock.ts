import { invoke } from '@tauri-apps/api/core';

export interface AppLockStatus {
  configured: boolean;
  unlocked: boolean;
}

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return '__TAURI_INTERNALS__' in window;
}

export async function getAppLockStatus(): Promise<AppLockStatus> {
  try {
    return await invoke<AppLockStatus>('app_lock_status');
  } catch (error) {
    // Browser/unit-test environments may not expose Tauri commands.
    if (!isTauriRuntime()) {
      return { configured: false, unlocked: true };
    }

    // Fail closed in Tauri runtime if status cannot be resolved.
    console.error('Failed to read app lock status:', error);
    return { configured: true, unlocked: false };
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
