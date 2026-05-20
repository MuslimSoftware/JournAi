import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  localKeyset: {
    schemaVersion: 1 as const,
    algorithm: 'AES-256-GCM' as const,
    kdf: 'PBKDF2-SHA-256' as const,
    iterations: 100000,
    saltB64: 'salt',
    wrappedKeyB64: 'wrapped',
    ivB64: 'iv',
    createdAt: '2026-05-19T08:00:00.000Z',
  },
  connector: {
    provider: 'google_drive' as const,
    getStatus: vi.fn(),
    listRemoteObjects: vi.fn(),
    downloadObject: vi.fn(),
    uploadObject: vi.fn(),
    deleteObject: vi.fn(),
  },
  select: vi.fn(),
  execute: vi.fn(),
  executeBatch: vi.fn(),
  decryptJsonPayload: vi.fn(),
  encryptJsonPayload: vi.fn(),
  hashJsonPayload: vi.fn(),
  setLastSyncedAt: vi.fn(),
}));

vi.mock('../connectors', () => ({
  createSyncConnector: () => mocks.connector,
}));

vi.mock('../settings', () => ({
  getSyncSettings: () => Promise.resolve({
    enabled: true,
    provider: 'google_drive',
    deviceId: 'device-1',
    lastSyncedAt: null,
  }),
  getRawSyncKey: () => Promise.resolve('raw-key'),
  getStoredSyncKeyset: () => Promise.resolve(mocks.localKeyset),
  setLastSyncedAt: (...args: unknown[]) => mocks.setLastSyncedAt(...args),
}));

vi.mock('../crypto', () => ({
  decryptJsonPayload: (...args: unknown[]) => mocks.decryptJsonPayload(...args),
  encryptJsonPayload: (...args: unknown[]) => mocks.encryptJsonPayload(...args),
  hashJsonPayload: (...args: unknown[]) => mocks.hashJsonPayload(...args),
}));

vi.mock('../../../lib/db', () => ({
  select: (...args: unknown[]) => mocks.select(...args),
  execute: (...args: unknown[]) => mocks.execute(...args),
  executeBatch: (...args: unknown[]) => mocks.executeBatch(...args),
}));

import { syncNow } from '../engine';

describe('sync engine integrity', () => {
  const localState = {
    collection: 'entries',
    record_id: 'entry-1',
    dirty: 1,
    deleted: 0,
    local_version: 3,
    remote_version: 1,
    updated_at: '2026-05-19T12:00:00.000Z',
    synced_at: null,
    remote_updated_at: null,
    payload_hash: null,
  };

  const remoteEnvelope = {
    schemaVersion: 1,
    appId: 'journai',
    collection: 'entries',
    recordId: 'entry-1',
    version: 2,
    deleted: false,
    updatedAt: '2026-05-19T11:00:00.000Z',
    deviceId: 'other-device',
    payloadHash: 'remote-hash',
    payload: {
      algorithm: 'AES-256-GCM',
      ivB64: 'iv',
      ciphertextB64: 'ciphertext',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const pendingConflicts: Array<{ collection: string; recordId: string }> = [];

    mocks.connector.getStatus.mockResolvedValue({ status: 'connected', message: null });
    mocks.connector.listRemoteObjects.mockResolvedValue([
      {
        path: 'records/entries/entry-1.json',
        modifiedAt: '2026-05-19T11:05:00.000Z',
      },
    ]);
    mocks.connector.downloadObject.mockImplementation((path: string) => {
      if (path === 'manifest/sync-key.json') {
        return Promise.resolve(JSON.stringify(mocks.localKeyset));
      }

      if (path === 'records/entries/entry-1.json') {
        return Promise.resolve(JSON.stringify(remoteEnvelope));
      }

      return Promise.resolve(null);
    });
    mocks.connector.uploadObject.mockResolvedValue('2026-05-19T12:05:00.000Z');
    mocks.decryptJsonPayload.mockResolvedValue({
      id: 'entry-1',
      date: '2026-05-19',
      content: 'Remote edit',
      created_at: '2026-05-19T09:00:00.000Z',
      updated_at: '2026-05-19T11:00:00.000Z',
      last_content_update: null,
    });

    mocks.select.mockImplementation((query: string, values?: unknown[]) => {
      if (query.includes('FROM sync_state WHERE collection = $1 AND record_id = $2')) {
        return Promise.resolve([{ ...localState }]);
      }

      if (query.includes('FROM entries WHERE id = $1')) {
        return Promise.resolve([
          {
            id: values?.[0],
            date: '2026-05-19',
            content: 'Local edit',
            created_at: '2026-05-19T09:00:00.000Z',
            updated_at: '2026-05-19T12:00:00.000Z',
            last_content_update: null,
          },
        ]);
      }

      if (query.includes('FROM sync_state s')) {
        const hasPendingConflict = pendingConflicts.some(
          (conflict) => conflict.collection === 'entries' && conflict.recordId === 'entry-1'
        );
        return Promise.resolve(query.includes('NOT EXISTS') && hasPendingConflict ? [] : [{ ...localState }]);
      }

      return Promise.resolve([]);
    });

    mocks.execute.mockImplementation((query: string, values?: unknown[]) => {
      if (query.includes('INSERT INTO sync_conflicts')) {
        pendingConflicts.push({
          collection: values?.[1] as string,
          recordId: values?.[2] as string,
        });
      }

      return Promise.resolve({ rowsAffected: 1 });
    });

    mocks.executeBatch.mockResolvedValue(undefined);
    mocks.setLastSyncedAt.mockResolvedValue(undefined);
  });

  it('does not push a dirty record after saving an unresolved conflict for it', async () => {
    const summary = await syncNow();

    expect(summary.conflicts).toBe(1);
    expect(summary.pushed).toBe(0);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_conflicts'),
      expect.arrayContaining(['entries', 'entry-1'])
    );
    expect(mocks.connector.uploadObject).not.toHaveBeenCalled();
  });

  it('aborts before syncing records when the remote keyset differs', async () => {
    mocks.connector.downloadObject.mockImplementation((path: string) => {
      if (path === 'manifest/sync-key.json') {
        return Promise.resolve(JSON.stringify({
          ...mocks.localKeyset,
          wrappedKeyB64: 'different-wrapped-key',
        }));
      }

      return Promise.resolve(null);
    });

    await expect(syncNow()).rejects.toThrow('Cloud sync already uses a different encryption key.');

    expect(mocks.connector.listRemoteObjects).not.toHaveBeenCalled();
    expect(mocks.executeBatch).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_conflicts'),
      expect.anything()
    );
  });
});
