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

interface TestSyncState {
  collection: 'entries' | 'sticky_notes';
  record_id: string;
  dirty: number;
  deleted: number;
  local_version: number;
  remote_version: number;
  updated_at: string;
  synced_at: string | null;
  remote_updated_at: string | null;
  payload_hash: string | null;
}

describe('sync engine integrity', () => {
  const localState: TestSyncState = {
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
  let currentSyncState: TestSyncState;

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
    currentSyncState = { ...localState };

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
    mocks.encryptJsonPayload.mockResolvedValue({
      ivB64: 'local-iv',
      ciphertextB64: 'local-ciphertext',
      hash: 'local-hash',
    });
    mocks.hashJsonPayload.mockResolvedValue('deleted-hash');

    mocks.select.mockImplementation((query: string, values?: unknown[]) => {
      if (query.includes('FROM sync_state WHERE collection = $1 AND record_id = $2')) {
        return Promise.resolve([{ ...currentSyncState }]);
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
        return Promise.resolve(currentSyncState.dirty === 1 ? [{ ...currentSyncState }] : []);
      }

      return Promise.resolve([]);
    });

    mocks.execute.mockImplementation((query: string, values?: unknown[]) => {
      if (query.includes('UPDATE sync_state SET') && query.includes('dirty = 1')) {
        currentSyncState = {
          ...currentSyncState,
          dirty: 1,
          local_version: currentSyncState.local_version + 1,
          updated_at: values?.[2] as string,
        };
      }

      return Promise.resolve({ rowsAffected: 1 });
    });

    mocks.executeBatch.mockImplementation((statements: Array<{ query: string; values?: unknown[] }>) => {
      const stateStatement = statements.find((statement) => statement.query.includes('INSERT INTO sync_state'));
      if (stateStatement?.values && stateStatement.values.length >= 6) {
        const version = stateStatement.values[3] as number;
        currentSyncState = {
          ...currentSyncState,
          dirty: 0,
          deleted: stateStatement.values[2] as number,
          local_version: Math.max(currentSyncState.local_version, version),
          remote_version: Math.max(currentSyncState.remote_version, version),
          updated_at: stateStatement.values[4] as string,
          payload_hash: stateStatement.values[5] as string,
        };
      }
      return Promise.resolve();
    });
    mocks.setLastSyncedAt.mockResolvedValue(undefined);
    mocks.storeRawSyncKey.mockResolvedValue(undefined);
  });

  it('keeps a newer dirty local record and pushes it over the stale cloud copy', async () => {
    const summary = await syncNow();

    expect(summary.conflicts).toBe(0);
    expect(summary.pushed).toBe(1);
    expect(mocks.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_conflicts'),
      expect.anything()
    );
    expect(mocks.encryptJsonPayload).toHaveBeenCalledWith(
      'raw-key',
      expect.objectContaining({ id: 'entry-1', content: 'Local edit' })
    );
    expect(mocks.connector.uploadObject).toHaveBeenCalledWith(
      'records/entries/entry-1.json',
      expect.stringContaining('"payloadHash": "local-hash"')
    );
  });

  it('applies a newer cloud record automatically instead of saving a manual conflict', async () => {
    mocks.connector.downloadObject.mockImplementation((path: string) => {
      if (path === 'manifest/sync-key.json') {
        return Promise.resolve(JSON.stringify({
          v: 1,
          keyB64: 'raw-key',
          createdAt: '2026-05-19T08:00:00.000Z',
        }));
      }

      if (path === 'records/entries/entry-1.json') {
        return Promise.resolve(JSON.stringify({
          ...remoteEnvelope,
          updatedAt: '2026-05-19T13:00:00.000Z',
          version: 4,
        }));
      }

      return Promise.resolve(null);
    });
    mocks.decryptJsonPayload.mockResolvedValue({
      id: 'entry-1',
      date: '2026-05-19',
      content: 'Remote newer edit',
      created_at: '2026-05-19T09:00:00.000Z',
      updated_at: '2026-05-19T13:00:00.000Z',
      last_content_update: null,
    });

    const summary = await syncNow();

    expect(summary.conflicts).toBe(0);
    expect(summary.pushed).toBe(0);
    expect(mocks.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_conflicts'),
      expect.anything()
    );
    expect(mocks.executeBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('INSERT INTO entries'),
          values: expect.arrayContaining(['Remote newer edit']),
        }),
      ])
    );
  });

  it('pushes a newer local sticky-note deletion over a stale cloud note', async () => {
    currentSyncState = {
      collection: 'sticky_notes',
      record_id: 'note-1',
      dirty: 1,
      deleted: 1,
      local_version: 5,
      remote_version: 4,
      updated_at: '2026-05-19T12:00:00.000Z',
      synced_at: null,
      remote_updated_at: null,
      payload_hash: null,
    };
    mocks.connector.listRemoteObjects.mockResolvedValue([
      {
        path: 'records/sticky_notes/note-1.json',
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

      if (path === 'records/sticky_notes/note-1.json') {
        return Promise.resolve(JSON.stringify({
          schemaVersion: 1,
          appId: 'journai',
          collection: 'sticky_notes',
          recordId: 'note-1',
          version: 4,
          deleted: false,
          updatedAt: '2026-05-19T11:00:00.000Z',
          deviceId: 'other-device',
          payloadHash: 'remote-note-hash',
          payload: {
            algorithm: 'AES-256-GCM',
            ivB64: 'iv',
            ciphertextB64: 'ciphertext',
          },
        }));
      }

      return Promise.resolve(null);
    });
    mocks.decryptJsonPayload.mockResolvedValue({
      id: 'note-1',
      date: '2026-05-18',
      content: 'Old note date',
      created_at: '2026-05-18T09:00:00.000Z',
      updated_at: '2026-05-19T11:00:00.000Z',
    });

    const summary = await syncNow();

    expect(summary.conflicts).toBe(0);
    expect(summary.pushed).toBe(1);
    expect(summary.pushedNotes).toBe(1);
    expect(mocks.connector.uploadObject).toHaveBeenCalledWith(
      'records/sticky_notes/note-1.json',
      expect.stringContaining('"deleted": true')
    );
    expect(mocks.connector.uploadObject).toHaveBeenCalledWith(
      'records/sticky_notes/note-1.json',
      expect.stringContaining('"payload": null')
    );
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

    expect(summary.conflicts).toBe(0);
    expect(summary.pushed).toBe(1);
    expect(mocks.storeRawSyncKey).toHaveBeenCalledWith('remote-key');
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('remote-key', 'iv', 'ciphertext');
    expect(mocks.encryptJsonPayload).toHaveBeenCalledWith(
      'remote-key',
      expect.objectContaining({ id: 'entry-1', content: 'Local edit' })
    );
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

    expect(summary.conflicts).toBe(0);
    expect(summary.pushed).toBe(1);
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('stale-remote-key', 'iv', 'ciphertext');
    expect(mocks.decryptJsonPayload).toHaveBeenCalledWith('raw-key', 'iv', 'ciphertext');
    expect(mocks.storeRawSyncKey).not.toHaveBeenCalled();
    expect(mocks.connector.uploadObject).toHaveBeenCalledWith(
      'manifest/sync-key.json',
      expect.stringContaining('"keyB64": "raw-key"')
    );
  });
});
