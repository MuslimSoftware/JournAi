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

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(apiKey: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

export function deleteApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}
