import type { SyncCollection, SyncEnvelope, SyncKeyset, SyncProgress, SyncSummary } from '../../types/sync';
import { decryptJsonPayload, encryptJsonPayload, hashJsonPayload } from './crypto';
import { createSyncConnector } from './connectors';
import {
  applyRemoteRecord,
  getDirtyRecords,
  getLocalPayload,
  getSyncState,
  markRecordSynced,
  saveSyncConflict,
  initializeSyncStates,
  updateSyncedAt,
} from './localRepository';
import {
  getRawSyncKey,
  getStoredSyncKeyset,
  getSyncSettings,
  setLastSyncedAt,
} from './settings';

const SYNC_KEYSET_PATH = 'manifest/sync-key.json';
const RECORD_PREFIX = 'records';

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
  const recordId = parts[2].slice(0, -5); // remove .json
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

function syncKeysetsMatch(local: SyncKeyset, remote: SyncKeyset): boolean {
  return local.schemaVersion === remote.schemaVersion
    && local.algorithm === remote.algorithm
    && local.kdf === remote.kdf
    && local.iterations === remote.iterations
    && local.saltB64 === remote.saltB64
    && local.wrappedKeyB64 === remote.wrappedKeyB64
    && local.ivB64 === remote.ivB64
    && local.createdAt === remote.createdAt;
}

async function ensureRemoteKeyset(connector: ReturnType<typeof createSyncConnector>, localKeyset: SyncKeyset): Promise<void> {
  const remote = await connector.downloadObject(SYNC_KEYSET_PATH);
  if (remote) {
    let remoteKeyset: SyncKeyset;
    try {
      remoteKeyset = JSON.parse(remote) as SyncKeyset;
    } catch {
      throw new Error('Cloud sync key metadata is invalid. Reset sync or reconnect the provider before syncing.');
    }

    if (!syncKeysetsMatch(localKeyset, remoteKeyset)) {
      throw new Error('Cloud sync already uses a different encryption key. Reset sync on this device or unlock the existing cloud passphrase before syncing.');
    }

    return;
  }

  await connector.uploadObject(SYNC_KEYSET_PATH, JSON.stringify(localKeyset, null, 2));
}

async function applyEnvelope(envelope: SyncEnvelope, rawKeyB64: string, remoteModifiedAt?: string | null): Promise<'applied' | 'skipped' | 'conflict'> {
  const state = await getSyncState(envelope.collection, envelope.recordId);
  if (state && state.remote_version >= envelope.version && state.dirty !== 1) {
    // Realign synced_at timestamp in the database to the remote's modifiedTime
    // so we don't have to download it again during the next handshake
    await updateSyncedAt(envelope.collection, envelope.recordId, remoteModifiedAt ?? undefined);
    return 'skipped';
  }

  const remotePayload = envelope.payload
    ? await decryptJsonPayload<Record<string, unknown>>(
      rawKeyB64,
      envelope.payload.ivB64,
      envelope.payload.ciphertextB64
    )
    : null;

  if (state?.dirty === 1) {
    const localPayload = await getLocalPayload(envelope.collection, envelope.recordId);
    await saveSyncConflict(envelope.collection, envelope.recordId, localPayload, remotePayload);
    if (state.updated_at > envelope.updatedAt) {
      return 'conflict';
    }
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

  return state?.dirty === 1 ? 'conflict' : 'applied';
}

export async function getRemoteSyncKeyset(): Promise<SyncKeyset | null> {
  const settings = await getSyncSettings();
  if (!settings.provider) {
    return null;
  }

  const connector = createSyncConnector(settings.provider);
  const status = await connector.getStatus();
  if (status.status !== 'connected') {
    return null;
  }

  const raw = await connector.downloadObject(SYNC_KEYSET_PATH);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SyncKeyset;
  } catch {
    return null;
  }
}

let isSyncRunning = false;

export async function syncNow(onProgress?: (progress: SyncProgress) => void): Promise<SyncSummary> {
  if (isSyncRunning) {
    console.warn('[SyncEngine] Sync is already running globally. Aborting this request.');
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
    console.log('[SyncEngine] Starting synchronization process...');
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

    if (!settings.provider) {
      console.log('[SyncEngine] Sync aborted: no provider configured.');
      return {
        ...emptySummary,
        status: 'disconnected',
        message: 'Choose a sync provider first.',
      };
    }

    console.log(`[SyncEngine] Selected provider: ${settings.provider}. Checking connection status...`);
    const connector = createSyncConnector(settings.provider);
    const status = await connector.getStatus();
    if (status.status !== 'connected') {
      console.warn(`[SyncEngine] Sync aborted: provider is not connected. Status: ${status.status}, Message: ${status.message}`);
      return {
        ...emptySummary,
        status: status.status,
        message: status.message,
      };
    }

    console.log('[SyncEngine] Provider connected. Loading encryption keys...');
    const rawKeyB64 = await getRawSyncKey();
    const localKeyset = await getStoredSyncKeyset();
    if (!rawKeyB64 || !localKeyset) {
      console.warn('[SyncEngine] Sync aborted: encryption key not configured or locked.');
      return {
        ...emptySummary,
        status: 'needs_configuration',
        message: 'Create or unlock the sync encryption key before syncing.',
      };
    }

    onProgress?.({
      phase: 'preparing',
      message: 'Preparing encrypted sync...',
      current: 0,
      total: 0,
    });

    console.log('[SyncEngine] Ensuring remote sync keyset exists in the cloud...');
    await ensureRemoteKeyset(connector, localKeyset);

    console.log('[SyncEngine] Initializing sync state: marking any untracked local records as dirty...');
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

    console.log('[SyncEngine] Pull Phase: Fetching remote objects list from cloud...');
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

        // Performance Optimization: Check local sync state to skip downloading unchanged objects
        const parsed = parseRecordPath(object.path);
        if (parsed) {
          const state = await getSyncState(parsed.collection, parsed.recordId);
          console.log(`[SyncEngine] Check skip for ${object.path}: stateExists=${!!state}, synced_at=${state?.synced_at}, dirty=${state?.dirty}, modifiedAt=${object.modifiedAt}`);
          if (state && state.synced_at && state.dirty !== 1 && object.modifiedAt) {
            const remoteTime = new Date(object.modifiedAt).getTime();
            const localSyncedTime = new Date(state.synced_at).getTime();
            // Skip if the cloud record has not been modified since the last sync (with 2s clock drift buffer)
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
        const result = await applyEnvelope(envelope, rawKeyB64, object.modifiedAt);
        console.log(`[SyncEngine] Application result for ${envelope.recordId}: ${result}`);
        if (result === 'applied' || result === 'skipped' || result === 'conflict') {
          if (envelope.collection === 'entries') {
            pulledEntries += 1;
          } else if (envelope.collection === 'todos') {
            pulledTodos += 1;
          } else if (envelope.collection === 'sticky_notes') {
            pulledNotes += 1;
          }
          pulled += 1;

          if (result === 'conflict') {
            conflicts += 1;
          }
        }
      }
    }

    console.log('[SyncEngine] Push Phase: Querying all local dirty records to upload...');
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
          ? await encryptJsonPayload(rawKeyB64, record.payload)
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
