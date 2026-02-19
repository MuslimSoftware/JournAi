import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

interface SecureStoragePayload {
  key?: string;
  value?: string;
}

describe('secureStorage API key persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInvoke.mockReset();
    localStorage.clear();
  });

  it('reads and writes API key using secure storage only', async () => {
    let secureApiKey: string | null = null;

    mockInvoke.mockImplementation(async (command: string, payload?: SecureStoragePayload) => {
      switch (command) {
        case 'secure_storage_is_available':
          return true;
        case 'secure_storage_get':
          return payload?.key === 'journai.apiKey' ? secureApiKey : null;
        case 'secure_storage_set':
          if (payload?.key === 'journai.apiKey') {
            secureApiKey = payload.value ?? null;
          }
          return undefined;
        case 'secure_storage_delete':
          secureApiKey = null;
          return undefined;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    });

    const { getApiKey, setApiKey } = await import('../secureStorage');
    await setApiKey('sk-test-key-12345678901234567890');

    expect(await getApiKey()).toBe('sk-test-key-12345678901234567890');
    expect(mockInvoke).toHaveBeenCalledWith('secure_storage_set', {
      key: 'journai.apiKey',
      value: 'sk-test-key-12345678901234567890',
    });
  });

  it('does not read API key from localStorage', async () => {
    mockInvoke.mockImplementation(async (command: string, payload?: SecureStoragePayload) => {
      switch (command) {
        case 'secure_storage_is_available':
          return true;
        case 'secure_storage_get':
          return payload?.key === 'journai.apiKey' ? null : null;
        case 'secure_storage_set':
          return undefined;
        case 'secure_storage_delete':
          return undefined;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    });

    localStorage.setItem('journai.apiKey', 'sk-test-key-12345678901234567890');

    const { getApiKey } = await import('../secureStorage');
    expect(await getApiKey()).toBeNull();
  });

  it('returns remediation status when secure storage is unavailable', async () => {
    mockInvoke.mockImplementation(async (command: string) => {
      switch (command) {
        case 'secure_storage_is_available':
          return null;
        case 'secure_storage_get':
          return null;
        case 'secure_storage_set':
          return undefined;
        case 'secure_storage_delete':
          return undefined;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    });

    const { getApiKey, getApiKeyStorageStatus } = await import('../secureStorage');
    const apiKey = await getApiKey();
    const status = await getApiKeyStorageStatus();

    expect(apiKey).toBeNull();
    expect(status.message).toContain('Secure key storage is unavailable');
  });

  it('clears remediation message when storage becomes available', async () => {
    let storageAvailable = false;

    mockInvoke.mockImplementation(async (command: string) => {
      switch (command) {
        case 'secure_storage_is_available':
          return storageAvailable;
        case 'secure_storage_get':
          return null;
        case 'secure_storage_set':
          return undefined;
        case 'secure_storage_delete':
          return undefined;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    });

    const { getApiKeyStorageStatus } = await import('../secureStorage');

    const unavailableStatus = await getApiKeyStorageStatus();
    expect(unavailableStatus.available).toBe(false);
    expect(unavailableStatus.message).toContain('Secure key storage is unavailable');

    storageAvailable = true;
    const availableStatus = await getApiKeyStorageStatus();
    expect(availableStatus.available).toBe(true);
    expect(availableStatus.message).toBeNull();
  });

  it('deletes API key and re-locks AI features', async () => {
    let secureApiKey: string | null = null;

    mockInvoke.mockImplementation(async (command: string, payload?: SecureStoragePayload) => {
      switch (command) {
        case 'secure_storage_is_available':
          return true;
        case 'secure_storage_get':
          return payload?.key === 'journai.apiKey' ? secureApiKey : null;
        case 'secure_storage_set':
          if (payload?.key === 'journai.apiKey') {
            secureApiKey = payload.value ?? null;
          }
          return undefined;
        case 'secure_storage_delete':
          if (payload?.key === 'journai.apiKey') {
            secureApiKey = null;
          }
          return undefined;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    });

    const { getApiKey, setApiKey, deleteApiKey } = await import('../secureStorage');

    await setApiKey('sk-test-key-12345678901234567890');
    expect(await getApiKey()).toBe('sk-test-key-12345678901234567890');

    await deleteApiKey();
    expect(await getApiKey()).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith('secure_storage_delete', { key: 'journai.apiKey' });
  });
});
