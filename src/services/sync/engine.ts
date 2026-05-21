import type { SyncCollection, SyncEnvelope, SyncKeyManifest, SyncProgress, SyncSummary } from '../../types/sync';
import { decryptJsonPayload, encryptJsonPayload, hashJsonPayload } from './crypto';
import { createSyncConnector } from './connectors';
import { dlog, dwarn, derr } from '../../lib/devLog';
import {
  applyRemoteRecord,
  getDirtyRecords,
  getSyncState,
  markRecordPendingUpload,
  markRecordSynced,
  initializeSyncStates,
  updateSyncedAt,
} from './localRepository';
import {
  getRawSyncKey,
  getSyncSettings,
  setLastSyncedAt,
  storeRawSyncKey,
} from './settings';

const SYNC_KEY_PATH = 'manifest/sync-key.json';
const RECORD_PREFIX = 'records';

class SyncDecryptError extends Error {
  constructor(collection: SyncCollection, recordId: string) {
    super(decryptFailureMessage(collection, recordId));
    this.name = 'SyncDecryptError';
  }
}

interface SyncKeyResolution {
  activeRawKeyB64: string;
  fallbackRawKeyB64: string | null;
  shouldStoreActiveKey: boolean;
}

function collectionLabel(collection: string): string {
  switch (collection) {
    case 'entries':
      return 'journal entries';
    case 'todos':
      return 'todos';
    case 'sticky_notes':
      return 'sticky notes';
    default:
      return collection;
  }
}

function recordPath(collection: string, recordId: string): string {
  return `${RECORD_PREFIX}/${collection}/${recordId}.json`;
}

function isRecordPath(path: string): boolean {
  return path.startsWith(`${RECORD_PREFIX}/`) && path.endsWith('.json');
}

function parseRecordPath(path: string): { collection: SyncCollection; recordId: string } | null {
  if (!isRecordPath(path)) {
    return null;
  }
  const parts = path.split('/');
  if (parts.length !== 3) {
    return null;
  }
  const collection = parts[1] as SyncCollection;
  const recordId = parts[2].slice(0, -5);
  if (!['entries', 'todos', 'sticky_notes'].includes(collection)) {
    return null;
  }
  return { collection, recordId };
}

function parseEnvelope(raw: string): SyncEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as SyncEnvelope;
    if (parsed.schemaVersion !== 1 || parsed.appId !== 'journai') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseKeyManifest(raw: string): SyncKeyManifest | null {
  try {
    const manifest = JSON.parse(raw) as SyncKeyManifest;
    if (manifest.v !== 1 || typeof manifest.keyB64 !== 'string' || manifest.keyB64.length === 0) {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}

function decryptFailureMessage(collection: SyncCollection, recordId: string): string {
  return `Could not decrypt cloud ${collectionLabel(collection)} (${recordId}). The sync key on this device does not match the encrypted Google Drive data. Sync the device that last uploaded this data, then try again.`;
}

function compareTimestamps(left: string | null | undefined, right: string | null | undefined): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }

  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }
  return left.localeCompare(right);
}

async function uploadRemoteKey(connector: ReturnType<typeof createSyncConnector>, rawKeyB64: string): Promise<void> {
  const manifest: SyncKeyManifest = { v: 1, keyB64: rawKeyB64, createdAt: new Date().toISOString() };
  await connector.uploadObject(SYNC_KEY_PATH, JSON.stringify(manifest, null, 2));
}

async function ensureRemoteKey(connector: ReturnType<typeof createSyncConnector>, rawKeyB64: string): Promise<SyncKeyResolution> {
  const remote = await connector.downloadObject(SYNC_KEY_PATH);
  if (remote) {
    const existing = parseKeyManifest(remote);
    if (existing) {
      if (existing.keyB64 === rawKeyB64) {
        dlog('[sync:engine] ensureRemoteKey => valid key manifest already in Drive');
        return { activeRawKeyB64: rawKeyB64, fallbackRawKeyB64: null, shouldStoreActiveKey: false };
      }

      const hasRemoteRecords = (await connector.listRemoteObjects()).some((object) => isRecordPath(object.path));
      if (hasRemoteRecords) {
        dlog('[sync:engine] ensureRemoteKey => remote key differs and records exist, using Drive key first');
        return { activeRawKeyB64: existing.keyB64, fallbackRawKeyB64: rawKeyB64, shouldStoreActiveKey: true };
      }

      dlog('[sync:engine] ensureRemoteKey => existing manifest is stale or mismatched with no records, overwriting');
    } else {
      dlog('[sync:engine] ensureRemoteKey => existing manifest is invalid JSON, overwriting');
    }
  }

  await uploadRemoteKey(connector, rawKeyB64);
  dlog('[sync:engine] ensureRemoteKey => uploaded new key manifest');
  return { activeRawKeyB64: rawKeyB64, fallbackRawKeyB64: null, shouldStoreActiveKey: false };
}

export async function downloadRemoteKey(): Promise<string | null> {
  const connector = createSyncConnector();
  const status = await connector.getStatus();
  dlog('[sync:engine] downloadRemoteKey connector status =>', JSON.stringify(status));
  if (status.status !== 'connected') {
    dlog('[sync:engine] downloadRemoteKey => not connected, returning null');
    return null;
  }

  dlog('[sync:engine] downloadRemoteKey downloading from path =>', SYNC_KEY_PATH);
  const raw = await connector.downloadObject(SYNC_KEY_PATH);
  dlog('[sync:engine] downloadRemoteKey raw =>', raw ? `${raw.substring(0, 80)}...` : 'null');
  if (!raw) {
    return null;
  }

  try {
    const manifest = parseKeyManifest(raw);
    if (!manifest) {
      dlog('[sync:engine] downloadRemoteKey parsed manifest => invalid');
      return null;
    }
    dlog('[sync:engine] downloadRemoteKey parsed manifest version =>', manifest.v);
    return manifest.keyB64 ?? null;
  } catch (e) {
    derr('[sync:engine] downloadRemoteKey parse error =>', String(e));
    return null;
  }
}

export async function deleteAllRemoteData(): Promise<void> {
  dlog('[sync:engine] deleteAllRemoteData start');
  const connector = createSyncConnector();
  const status = await connector.getStatus();
  if (status.status !== 'connected') {
    dwarn('[sync:engine] deleteAllRemoteData => not connected, skipping');
    return;
  }

  const remoteObjects = await connector.listRemoteObjects();
  dlog('[sync:engine] deleteAllRemoteData found objects =>', remoteObjects.length);

  for (const object of remoteObjects) {
    try {
      await connector.deleteObject(object.path);
      dlog('[sync:engine] deleteAllRemoteData deleted =>', object.path);
    } catch (e) {
      dwarn('[sync:engine] deleteAllRemoteData failed to delete =>', object.path, String(e));
    }
  }

  // Explicitly delete the key manifest in case it wasn't returned by the listing
  try {
    await connector.deleteObject(SYNC_KEY_PATH);
    dlog('[sync:engine] deleteAllRemoteData explicitly deleted key manifest');
  } catch (e) {
    dlog('[sync:engine] deleteAllRemoteData key manifest explicit delete =>', String(e));
  }

  dlog('[sync:engine] deleteAllRemoteData complete');
}

async function applyEnvelope(envelope: SyncEnvelope, rawKeyB64: string, remoteModifiedAt?: string | null): Promise<'applied' | 'skipped'> {
  const state = await getSyncState(envelope.collection, envelope.recordId);
  const localVsRemote = state ? compareTimestamps(state.updated_at, envelope.updatedAt) : 0;

  if (
    state &&
    state.dirty !== 1 &&
    state.payload_hash === envelope.payloadHash &&
    state.deleted === (envelope.deleted ? 1 : 0)
  ) {
    await updateSyncedAt(envelope.collection, envelope.recordId, remoteModifiedAt ?? undefined);
    return 'skipped';
  }

  let remotePayload: Record<string, unknown> | null = null;
  if (envelope.payload) {
    try {
      remotePayload = await decryptJsonPayload<Record<string, unknown>>(
        rawKeyB64,
        envelope.payload.ivB64,
        envelope.payload.ciphertextB64
      );
    } catch (e) {
      derr('[sync:engine] applyEnvelope decrypt failed for', envelope.collection, envelope.recordId, String(e));
      throw new SyncDecryptError(envelope.collection, envelope.recordId);
    }
  }

  if (state?.dirty === 1 && localVsRemote >= 0) {
    return 'skipped';
  }

  if (state && state.dirty !== 1 && localVsRemote > 0) {
    await markRecordPendingUpload(envelope.collection, envelope.recordId, state.updated_at);
    return 'skipped';
  }

  await applyRemoteRecord(
    envelope.collection,
    envelope.recordId,
    envelope.version,
    envelope.updatedAt,
    envelope.payloadHash,
    envelope.deleted,
    remotePayload,
    remoteModifiedAt ?? undefined
  );

  return 'applied';
}

let isSyncRunning = false;

export async function syncNow(onProgress?: (progress: SyncProgress) => void): Promise<SyncSummary> {
  if (isSyncRunning) {
    dwarn('[SyncEngine] Sync is already running globally. Aborting this request.');
    const settings = await getSyncSettings();
    return {
      status: 'syncing',
      message: 'Sync is already running.',
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      lastSyncedAt: settings.lastSyncedAt,
      pulledEntries: 0,
      pulledTodos: 0,
      pulledNotes: 0,
      pushedEntries: 0,
      pushedTodos: 0,
      pushedNotes: 0,
    };
  }

  isSyncRunning = true;
  try {
    dlog('[SyncEngine] Starting synchronization process...');
    const settings = await getSyncSettings();
    const emptySummary = {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      lastSyncedAt: settings.lastSyncedAt,
      pulledEntries: 0,
      pulledTodos: 0,
      pulledNotes: 0,
      pushedEntries: 0,
      pushedTodos: 0,
      pushedNotes: 0,
    };

    console.log('[SyncEngine] Checking Google Drive connection status...');
    const connector = createSyncConnector();
    const status = await connector.getStatus();
    if (status.status !== 'connected') {
      console.warn(`[SyncEngine] Sync aborted: provider is not connected. Status: ${status.status}, Message: ${status.message}`);
      return {
        ...emptySummary,
        status: status.status,
        message: status.message,
      };
    }

    dlog('[SyncEngine] Provider connected. Loading encryption key...');
    const rawKeyB64 = await getRawSyncKey();
    if (!rawKeyB64) {
      dwarn('[SyncEngine] Sync aborted: encryption key not configured.');
      return {
        ...emptySummary,
        status: 'needs_configuration',
        message: 'Sync encryption key is not set up.',
      };
    }

    onProgress?.({
      phase: 'preparing',
      message: 'Preparing encrypted sync...',
      current: 0,
      total: 0,
    });

    dlog('[SyncEngine] Ensuring remote key manifest exists in the cloud...');
    const keyResolution = await ensureRemoteKey(connector, rawKeyB64);
    let activeRawKeyB64 = keyResolution.activeRawKeyB64;
    let fallbackRawKeyB64 = keyResolution.fallbackRawKeyB64;
    let shouldStoreActiveKey = keyResolution.shouldStoreActiveKey;

    dlog('[SyncEngine] Initializing sync state: marking any untracked local records as dirty...');
    await initializeSyncStates();

    let pulled = 0;
    let pushed = 0;
    let conflicts = 0;
    let pulledEntries = 0;
    let pulledTodos = 0;
    let pulledNotes = 0;
    let pushedEntries = 0;
    let pushedTodos = 0;
    let pushedNotes = 0;

    dlog('[SyncEngine] Pull Phase: Fetching remote objects list from cloud...');
    const remoteObjects = await connector.listRemoteObjects();
    const recordObjects = remoteObjects.filter((object) => isRecordPath(object.path));
    console.log(`[SyncEngine] Pull Phase: Found ${remoteObjects.length} total files, of which ${recordObjects.length} are records.`);

    const collections = ['entries', 'todos', 'sticky_notes'] as const;

    for (const coll of collections) {
      const collObjects = recordObjects.filter(o => o.path.startsWith(`${RECORD_PREFIX}/${coll}/`));
      if (collObjects.length === 0) {
        continue;
      }

      console.log(`[SyncEngine] Pull Phase: Checking cloud changes for ${collectionLabel(coll)} (Total: ${collObjects.length})...`);

      for (let index = 0; index < collObjects.length; index += 1) {
        const object = collObjects[index];
        console.log(`[SyncEngine] Checking cloud record ${index + 1}/${collObjects.length} for ${coll}: ${object.path}`);

        const parsed = parseRecordPath(object.path);
        if (parsed) {
          const state = await getSyncState(parsed.collection, parsed.recordId);
          console.log(`[SyncEngine] Check skip for ${object.path}: stateExists=${!!state}, synced_at=${state?.synced_at}, dirty=${state?.dirty}, modifiedAt=${object.modifiedAt}`);
          if (state && state.synced_at && state.dirty !== 1 && object.modifiedAt) {
            const remoteTime = new Date(object.modifiedAt).getTime();
            const localSyncedTime = new Date(state.synced_at).getTime();
            if (remoteTime - 2000 <= localSyncedTime) {
              console.log(`[SyncEngine] Skipped remote download (unchanged since last sync): ${object.path}`);
              continue;
            }
          }
        }

        onProgress?.({
          phase: 'downloading',
          message: `Checking cloud ${collectionLabel(coll)} ${index + 1}/${collObjects.length}...`,
          current: index + 1,
          total: collObjects.length,
        });

        const raw = await connector.downloadObject(object.path);
        if (!raw) {
          console.warn(`[SyncEngine] Failed to download remote object: ${object.path}`);
          continue;
        }

        const envelope = parseEnvelope(raw);
        if (!envelope) {
          console.warn(`[SyncEngine] Ignored remote object: invalid or unsupported envelope: ${object.path}`);
          continue;
        }

        console.log(`[SyncEngine] Applying remote record: collection=${envelope.collection}, recordId=${envelope.recordId}, version=${envelope.version}...`);
        let result: 'applied' | 'skipped';
        try {
          result = await applyEnvelope(envelope, activeRawKeyB64, object.modifiedAt);
        } catch (error) {
          if (!(error instanceof SyncDecryptError) || !fallbackRawKeyB64) {
            throw error;
          }

          dwarn('[sync:engine] active Drive key failed to decrypt record, retrying with local key and repairing manifest');
          activeRawKeyB64 = fallbackRawKeyB64;
          fallbackRawKeyB64 = null;
          shouldStoreActiveKey = false;
          await uploadRemoteKey(connector, activeRawKeyB64);
          result = await applyEnvelope(envelope, activeRawKeyB64, object.modifiedAt);
        }
        console.log(`[SyncEngine] Application result for ${envelope.recordId}: ${result}`);
        if (result === 'applied' || result === 'skipped') {
          if (envelope.collection === 'entries') {
            pulledEntries += 1;
          } else if (envelope.collection === 'todos') {
            pulledTodos += 1;
          } else if (envelope.collection === 'sticky_notes') {
            pulledNotes += 1;
          }
          pulled += 1;
        }
      }
    }

    if (shouldStoreActiveKey) {
      dlog('[sync:engine] storing adopted Drive key locally');
      await storeRawSyncKey(activeRawKeyB64);
      shouldStoreActiveKey = false;
    }

    dlog('[SyncEngine] Push Phase: Querying all local dirty records to upload...');
    const dirtyRecords = await getDirtyRecords();
    console.log(`[SyncEngine] Push Phase: Found ${dirtyRecords.length} dirty record(s) to upload.`);
    const syncedAt = new Date().toISOString();

    for (const coll of collections) {
      const collRecords = dirtyRecords.filter(r => r.collection === coll);
      if (collRecords.length === 0) {
        continue;
      }

      console.log(`[SyncEngine] Push Phase: Uploading ${collectionLabel(coll)} (Total: ${collRecords.length})...`);

      for (let index = 0; index < collRecords.length; index += 1) {
        const record = collRecords[index];
        console.log(`[SyncEngine] Uploading record ${index + 1}/${collRecords.length}: collection=${record.collection}, recordId=${record.recordId}, local_version=${record.version}`);
        onProgress?.({
          phase: 'uploading',
          message: `Uploading ${collectionLabel(record.collection)} ${index + 1}/${collRecords.length}...`,
          current: index + 1,
          total: collRecords.length,
        });

        const encrypted = record.payload
          ? await encryptJsonPayload(activeRawKeyB64, record.payload)
          : null;
        const payloadHash = encrypted?.hash ?? await hashJsonPayload({ deleted: true, recordId: record.recordId });
        const envelope: SyncEnvelope = {
          schemaVersion: 1,
          appId: 'journai',
          collection: record.collection,
          recordId: record.recordId,
          version: record.version,
          deleted: record.deleted,
          updatedAt: record.updatedAt,
          deviceId: settings.deviceId,
          payloadHash,
          payload: encrypted
            ? {
              algorithm: 'AES-256-GCM',
              ivB64: encrypted.ivB64,
              ciphertextB64: encrypted.ciphertextB64,
            }
            : null,
        };

        const targetPath = recordPath(record.collection, record.recordId);
        console.log(`[SyncEngine] Encrypted and uploading to path: ${targetPath}`);
        const remoteModifiedAt = await connector.uploadObject(targetPath, JSON.stringify(envelope, null, 2));
        await markRecordSynced(record.collection, record.recordId, record.version, remoteModifiedAt || syncedAt, payloadHash, record.deleted);
        pushed += 1;
        if (record.collection === 'entries') {
          pushedEntries += 1;
        } else if (record.collection === 'todos') {
          pushedTodos += 1;
        } else if (record.collection === 'sticky_notes') {
          pushedNotes += 1;
        }
        console.log(`[SyncEngine] Upload and database state update completed for recordId: ${record.recordId}`);
      }
    }

    onProgress?.({
      phase: 'finalizing',
      message: 'Finalizing sync...',
      current: 1,
      total: 1,
    });

    console.log(`[SyncEngine] Saving last synced timestamp: ${syncedAt}`);
    await setLastSyncedAt(syncedAt);

    console.log(`[SyncEngine] Sync cycle finished successfully. Pushed: ${pushed}, Pulled: ${pulled}, Conflicts: ${conflicts}`);

    return {
      status: 'success',
      message: null,
      pushed,
      pulled,
      conflicts,
      lastSyncedAt: syncedAt,
      pulledEntries,
      pulledTodos,
      pulledNotes,
      pushedEntries,
      pushedTodos,
      pushedNotes,
    };
  } finally {
    isSyncRunning = false;
  }
}
