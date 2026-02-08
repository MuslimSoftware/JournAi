import { invoke } from '@tauri-apps/api/core';

class SecureStorage {
  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      this.available = await invoke<boolean>('secure_storage_is_available');
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async set(key: string, value: string): Promise<void> {
    await invoke('secure_storage_set', { key, value });
  }

  async get(key: string): Promise<string | null> {
    const result = await invoke<string | null>('secure_storage_get', { key });
    return result ?? null;
  }

  async delete(key: string): Promise<void> {
    await invoke('secure_storage_delete', { key });
  }
}

export const secureStorage = new SecureStorage();

const API_KEY_STORAGE_KEY = 'journai.apiKey';
const API_KEY_CHANGE_EVENT = 'journai:api-key-change';

function notifyApiKeyChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(apiKey: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  notifyApiKeyChanged();
}

export function deleteApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  notifyApiKeyChanged();
}

export function subscribeToApiKeyChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === API_KEY_STORAGE_KEY || event.key === null) {
      listener();
    }
  };

  window.addEventListener(API_KEY_CHANGE_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(API_KEY_CHANGE_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}
