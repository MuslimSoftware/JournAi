import type { RemoteSyncObject, SyncConnector, SyncConnectorStatus } from '../../../types/sync';
import { buildRemoteObject, fileNameToRemotePath, getAuthOrStatus, remotePathToFileName, requireOk } from './shared';

const PROVIDER = 'google_drive';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
}

interface GoogleListResponse {
  files?: GoogleFile[];
  nextPageToken?: string;
}

async function getAuthHeaders(): Promise<HeadersInit | SyncConnectorStatus> {
  const authResult = await getAuthOrStatus(PROVIDER);
  if ('status' in authResult) {
    return authResult.status;
  }

  return {
    Authorization: `Bearer ${authResult.auth.accessToken}`,
  };
}

function isStatus(value: HeadersInit | SyncConnectorStatus): value is SyncConnectorStatus {
  return 'status' in value;
}

const pathIdCache = new Map<string, string>();

async function findFileByPath(path: string, headers: HeadersInit): Promise<GoogleFile | null> {
  const cachedId = pathIdCache.get(path);
  if (cachedId) {
    return { id: cachedId, name: remotePathToFileName(path) };
  }

  const fileName = remotePathToFileName(path).replace(/'/g, "\\'");
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${fileName}' and trashed = false`,
    fields: 'files(id,name,modifiedTime,size,md5Checksum)',
    pageSize: '10',
  });
  const response = await requireOk(
    await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, { headers }),
    'Google Drive file lookup'
  );
  const body = await response.json() as GoogleListResponse;
  const file = body.files?.[0] ?? null;
  if (file) {
    pathIdCache.set(path, file.id);
  }
  return file;
}

export function createGoogleDriveConnector(): SyncConnector {
  return {
    provider: PROVIDER,
    async getStatus() {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        return headers;
      }

      return { status: 'connected', message: null };
    },
    async listRemoteObjects(): Promise<RemoteSyncObject[]> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Google Drive is disconnected.');
      }

      pathIdCache.clear(); // Clear cache at start of list to ensure freshness
      const objects: RemoteSyncObject[] = [];
      let pageToken: string | null = null;

      do {
        const params = new URLSearchParams({
          spaces: 'appDataFolder',
          q: "name contains 'journai-sync-' and trashed = false",
          fields: 'nextPageToken,files(id,name,modifiedTime,size,md5Checksum)',
          pageSize: '100',
        });
        if (pageToken) {
          params.set('pageToken', pageToken);
        }

        const response = await requireOk(
          await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, { headers }),
          'Google Drive list'
        );
        const body = await response.json() as GoogleListResponse;

        for (const file of body.files ?? []) {
          const path = fileNameToRemotePath(file.name);
          if (!path) {
            continue;
          }

          pathIdCache.set(path, file.id); // Populate cache with pre-fetched ID

          objects.push(buildRemoteObject(
            path,
            file.modifiedTime ?? null,
            file.size ? Number(file.size) : undefined,
            file.md5Checksum
          ));
        }

        pageToken = body.nextPageToken ?? null;
      } while (pageToken);

      // Keep only the newest version of each file in case Google Drive returned duplicate files with the same name
      const uniqueObjects = new Map<string, RemoteSyncObject>();
      for (const obj of objects) {
        const existing = uniqueObjects.get(obj.path);
        if (!existing || (obj.modifiedAt && existing.modifiedAt && new Date(obj.modifiedAt) > new Date(existing.modifiedAt))) {
          uniqueObjects.set(obj.path, obj);
        }
      }

      return Array.from(uniqueObjects.values());
    },
    async downloadObject(path: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Google Drive is disconnected.');
      }

      const file = await findFileByPath(path, headers);
      if (!file) {
        return null;
      }

      const response = await requireOk(
        await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(file.id)}?alt=media`, { headers }),
        'Google Drive download'
      );
      return response.text();
    },
    async uploadObject(path: string, content: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Google Drive is disconnected.');
      }

      const existing = await findFileByPath(path, headers);
      const metadata = {
        name: remotePathToFileName(path),
        parents: existing ? undefined : ['appDataFolder'],
      };
      const boundary = `journai-${Date.now()}`;
      const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        content,
        `--${boundary}--`,
        '',
      ].join('\r\n');

      const url = existing
        ? `${DRIVE_UPLOAD_URL}/${encodeURIComponent(existing.id)}?uploadType=multipart&fields=id,name,modifiedTime`
        : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime`;
      const method = existing ? 'PATCH' : 'POST';

      const response = await requireOk(
        await fetch(url, {
          method,
          headers: {
            ...headers,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }),
        'Google Drive upload'
      );
      try {
        const fileMetadata = await response.json() as GoogleFile;
        if (fileMetadata?.id) {
          pathIdCache.set(path, fileMetadata.id);
        }
        return fileMetadata?.modifiedTime ?? null;
      } catch {
        return null;
      }
    },
    async deleteObject(path: string): Promise<void> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Google Drive is disconnected.');
      }

      const file = await findFileByPath(path, headers);
      if (!file) {
        return;
      }

      await requireOk(
        await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(file.id)}`, {
          method: 'DELETE',
          headers,
        }),
        'Google Drive delete'
      );
      pathIdCache.delete(path);
    },
  };
}
