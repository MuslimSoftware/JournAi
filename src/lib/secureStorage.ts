import { invoke } from '@tauri-apps/api/core';

class SecureStorage {
  private available: boolean | null = null;

  async isAvailable(forceRefresh: boolean = false): Promise<boolean> {
    if (forceRefresh) {
      this.available = null;
    }
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
const API_KEY_STORAGE_STATUS_EVENT = 'journai:api-key-storage-status';
const SECURE_STORAGE_REMEDIATION_MESSAGE =
  'Secure key storage is unavailable. AI features are locked until OS secure storage is available.';

let lastStorageMessage: string | null = null;

function setLastStorageMessage(message: string | null): void {
  if (lastStorageMessage === message) {
    return;
  }
  lastStorageMessage = message;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(API_KEY_STORAGE_STATUS_EVENT));
  }
}

async function ensureSecureStorageAvailability(): Promise<boolean> {
  const available = await secureStorage.isAvailable();
  if (!available) {
    setLastStorageMessage(SECURE_STORAGE_REMEDIATION_MESSAGE);
    return false;
  }
  return true;
}

function notifyApiKeyChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
}

export interface ApiKeyStorageStatus {
  available: boolean;
  message: string | null;
}

export async function getApiKeyStorageStatus(): Promise<ApiKeyStorageStatus> {
  const available = await secureStorage.isAvailable(true);
  if (!available) {
    setLastStorageMessage(SECURE_STORAGE_REMEDIATION_MESSAGE);
    return {
      available: false,
      message: SECURE_STORAGE_REMEDIATION_MESSAGE,
    };
  }
  return {
    available: true,
    message: lastStorageMessage,
  };
}

export function getApiKeyStorageMessage(): string | null {
  return lastStorageMessage;
}

export async function getApiKey(): Promise<string | null> {
  const isSecureStorageAvailable = await ensureSecureStorageAvailability();
  if (!isSecureStorageAvailable) {
    return null;
  }

  try {
    const apiKey = await secureStorage.get(API_KEY_STORAGE_KEY);
    if (apiKey && apiKey.trim().length > 0) {
      setLastStorageMessage(null);
    }
    return apiKey;
  } catch (error) {
    console.error('Failed to read API key from secure storage:', error);
    setLastStorageMessage(SECURE_STORAGE_REMEDIATION_MESSAGE);
    return null;
  }
}

export async function setApiKey(apiKey: string): Promise<void> {
  const isSecureStorageAvailable = await ensureSecureStorageAvailability();
  if (!isSecureStorageAvailable) {
    throw new Error(SECURE_STORAGE_REMEDIATION_MESSAGE);
  }

  try {
    await secureStorage.set(API_KEY_STORAGE_KEY, apiKey.trim());
    setLastStorageMessage(null);
  } catch (error) {
    console.error('Failed to store API key in secure storage:', error);
    setLastStorageMessage(SECURE_STORAGE_REMEDIATION_MESSAGE);
    throw new Error(SECURE_STORAGE_REMEDIATION_MESSAGE);
  }
  notifyApiKeyChanged();
}

export async function deleteApiKey(): Promise<void> {
  const isSecureStorageAvailable = await ensureSecureStorageAvailability();
  if (!isSecureStorageAvailable) {
    throw new Error(SECURE_STORAGE_REMEDIATION_MESSAGE);
  }

  try {
    await secureStorage.delete(API_KEY_STORAGE_KEY);
    setLastStorageMessage(null);
  } catch (error) {
    console.error('Failed to delete API key from secure storage:', error);
    setLastStorageMessage(SECURE_STORAGE_REMEDIATION_MESSAGE);
    throw new Error(SECURE_STORAGE_REMEDIATION_MESSAGE);
  }
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
  window.addEventListener(API_KEY_STORAGE_STATUS_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(API_KEY_CHANGE_EVENT, listener);
    window.removeEventListener(API_KEY_STORAGE_STATUS_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}
