import { appStore, STORE_KEYS } from '../../lib/store';
import { secureStorage } from '../../lib/secureStorage';
import type { SyncAuthState, SyncProvider, SyncSettings } from '../../types/sync';
import { generateSyncKey } from './crypto';
import { dlog } from '../../lib/devLog';

const SYNC_AUTH_STORAGE_PREFIX = 'journai.sync.auth';
const SYNC_RAW_KEY_STORAGE_KEY = 'journai.sync.rawKey';

function createDeviceId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function authStorageKey(provider: SyncProvider): string {
  return `${SYNC_AUTH_STORAGE_PREFIX}.${provider}`;
}

async function ensureDeviceId(): Promise<string> {
  const existing = await appStore.get<string>(STORE_KEYS.SYNC_DEVICE_ID);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  await appStore.set(STORE_KEYS.SYNC_DEVICE_ID, deviceId);
  return deviceId;
}

export async function getSyncSettings(): Promise<SyncSettings> {
  const [enabled, lastSyncedAt, deviceId] = await Promise.all([
    appStore.get<boolean>(STORE_KEYS.SYNC_ENABLED),
    appStore.get<string>(STORE_KEYS.SYNC_LAST_SYNCED_AT),
    ensureDeviceId(),
  ]);

  dlog('[sync:settings] getSyncSettings =>', JSON.stringify({ enabled, lastSyncedAt }));

  return {
    enabled: enabled ?? false,
    provider: 'google_drive',
    deviceId,
    lastSyncedAt: lastSyncedAt ?? null,
  };
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  dlog('[sync:settings] setSyncEnabled =>', enabled);
  await appStore.set(STORE_KEYS.SYNC_ENABLED, enabled);
  const verify = await appStore.get<boolean>(STORE_KEYS.SYNC_ENABLED);
  dlog('[sync:settings] setSyncEnabled verify =>', verify);
}

export async function setLastSyncedAt(timestamp: string | null): Promise<void> {
  if (timestamp) {
    await appStore.set(STORE_KEYS.SYNC_LAST_SYNCED_AT, timestamp);
    return;
  }

  await appStore.delete(STORE_KEYS.SYNC_LAST_SYNCED_AT);
}

export async function getProviderAuth(provider: SyncProvider): Promise<SyncAuthState | null> {
  const raw = await secureStorage.get(authStorageKey(provider));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SyncAuthState;
  } catch {
    return null;
  }
}

export async function saveProviderAuth(provider: SyncProvider, auth: SyncAuthState): Promise<void> {
  await secureStorage.set(authStorageKey(provider), JSON.stringify(auth));
}

export async function saveProviderAccessToken(provider: SyncProvider, accessToken: string): Promise<void> {
  const auth: SyncAuthState = {
    accessToken: accessToken.trim(),
  };
  await saveProviderAuth(provider, auth);
}

export async function deleteProviderAuth(provider: SyncProvider): Promise<void> {
  await secureStorage.delete(authStorageKey(provider));
}

export async function getRawSyncKey(): Promise<string | null> {
  return secureStorage.get(SYNC_RAW_KEY_STORAGE_KEY);
}

export async function hasRawSyncKey(): Promise<boolean> {
  const key = await getRawSyncKey();
  return Boolean(key);
}

export async function storeRawSyncKey(rawKeyB64: string): Promise<void> {
  await secureStorage.set(SYNC_RAW_KEY_STORAGE_KEY, rawKeyB64);
  dlog('[sync:settings] storeRawSyncKey => key stored');
}

export async function generateAndStoreKey(): Promise<string> {
  const { rawKeyB64 } = await generateSyncKey();
  await secureStorage.set(SYNC_RAW_KEY_STORAGE_KEY, rawKeyB64);
  dlog('[sync:settings] generateAndStoreKey => new key stored');
  return rawKeyB64;
}

export async function clearSyncSecrets(provider?: SyncProvider | null): Promise<void> {
  await secureStorage.delete(SYNC_RAW_KEY_STORAGE_KEY);
  if (provider) {
    await deleteProviderAuth(provider);
  }
}
