import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
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
  storeRawSyncKey: vi.fn(),
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
  setLastSyncedAt: (...args: unknown[]) => mocks.setLastSyncedAt(...args),
  storeRawSyncKey: (...args: unknown[]) => mocks.storeRawSyncKey(...args),
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
        return Promise.resolve(JSON.stringify({
          v: 1,
          keyB64: 'raw-key',
          createdAt: '2026-05-19T08:00:00.000Z',
        }));
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
    mocks.storeRawSyncKey.mockResolvedValue(undefined);
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

  it('adopts the Drive key before syncing when encrypted records already exist', async () => {
    mocks.connector.downloadObject.mockImplementation((path: string) => {
      if (path === 'manifest/sync-key.json') {
        return Promise.resolve(JSON.stringify({
          v: 1,
          keyB64: 'remote-key',
          createdAt: '2026-05-19T08:00:00.000Z',
        }));
      }

      if (path === 'records/entries/entry-1.json') {
        return Promise.resolve(JSON.stringify(remoteEnvelope));
      }

      return Promise.resolve(null);
    });

    const summary = await syncNow();

    expect(summary.conflicts).toBe(1);
    expect(mocks.storeRawSyncKey).toHaveBeenCalledWith('remote-key');
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('remote-key', 'iv', 'ciphertext');
    expect(mocks.connector.uploadObject).not.toHaveBeenCalledWith(
      'manifest/sync-key.json',
      expect.any(String)
    );
  });

  it('falls back to the local key and repairs a stale Drive manifest', async () => {
    mocks.connector.downloadObject.mockImplementation((path: string) => {
      if (path === 'manifest/sync-key.json') {
        return Promise.resolve(JSON.stringify({
          v: 1,
          keyB64: 'stale-remote-key',
          createdAt: '2026-05-19T08:00:00.000Z',
        }));
      }

      if (path === 'records/entries/entry-1.json') {
        return Promise.resolve(JSON.stringify(remoteEnvelope));
      }

      return Promise.resolve(null);
    });
    mocks.decryptJsonPayload.mockImplementation((key: string) => {
      if (key === 'stale-remote-key') {
        return Promise.reject(new Error('decrypt failed'));
      }
      return Promise.resolve({
        id: 'entry-1',
        date: '2026-05-19',
        content: 'Remote edit',
        created_at: '2026-05-19T09:00:00.000Z',
        updated_at: '2026-05-19T11:00:00.000Z',
        last_content_update: null,
      });
    });

    const summary = await syncNow();

    expect(summary.conflicts).toBe(1);
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('stale-remote-key', 'iv', 'ciphertext');
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('raw-key', 'iv', 'ciphertext');
    expect(mocks.storeRawSyncKey).not.toHaveBeenCalled();
    expect(mocks.connector.uploadObject).toHaveBeenCalledWith(
      'manifest/sync-key.json',
      expect.stringContaining('"keyB64": "raw-key"')
    );
  });
});
