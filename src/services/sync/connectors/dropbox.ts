import type { RemoteSyncObject, SyncConnector, SyncConnectorStatus } from '../../../types/sync';
import { buildRemoteObject, fileNameToRemotePath, getAuthOrStatus, remotePathToFileName, requireOk } from './shared';

const PROVIDER = 'dropbox';
const DROPBOX_API_URL = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_URL = 'https://content.dropboxapi.com/2';

interface DropboxFileEntry {
  '.tag': 'file';
  name: string;
  path_lower: string;
  server_modified?: string;
  size?: number;
  content_hash?: string;
}

interface DropboxFolderEntry {
  '.tag': 'folder';
  name: string;
}

interface DropboxDeletedEntry {
  '.tag': 'deleted';
  name: string;
}

type DropboxEntry = DropboxFileEntry | DropboxFolderEntry | DropboxDeletedEntry;

interface DropboxListResponse {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
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

function dropboxPath(path: string): string {
  return `/${remotePathToFileName(path)}`;
}

export function createDropboxConnector(): SyncConnector {
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
        throw new Error(headers.message ?? 'Dropbox is disconnected.');
      }

      const objects: RemoteSyncObject[] = [];
      let response = await requireOk(
        await fetch(`${DROPBOX_API_URL}/files/list_folder`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: '',
            recursive: false,
            include_deleted: false,
          }),
        }),
        'Dropbox list'
      );
      let body = await response.json() as DropboxListResponse;

      while (true) {
        for (const entry of body.entries) {
          if (entry['.tag'] !== 'file') {
            continue;
          }

          const path = fileNameToRemotePath(entry.name);
          if (!path) {
            continue;
          }

          objects.push(buildRemoteObject(path, entry.server_modified ?? null, entry.size, entry.content_hash));
        }

        if (!body.has_more) {
          break;
        }

        response = await requireOk(
          await fetch(`${DROPBOX_API_URL}/files/list_folder/continue`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cursor: body.cursor }),
          }),
          'Dropbox list continue'
        );
        body = await response.json() as DropboxListResponse;
      }

      return objects;
    },
    async downloadObject(path: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Dropbox is disconnected.');
      }

      const response = await fetch(`${DROPBOX_CONTENT_URL}/files/download`, {
        method: 'POST',
        headers: {
          ...headers,
          'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath(path) }),
        },
      });

      if (response.status === 409) {
        return null;
      }

      await requireOk(response, 'Dropbox download');
      return response.text();
    },
    async uploadObject(path: string, content: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Dropbox is disconnected.');
      }

      const response = await requireOk(
        await fetch(`${DROPBOX_CONTENT_URL}/files/upload`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: dropboxPath(path),
              mode: 'overwrite',
              autorename: false,
              mute: true,
              strict_conflict: false,
            }),
          },
          body: content,
        }),
        'Dropbox upload'
      );
      try {
        const metadata = await response.json();
        return metadata.server_modified ?? null;
      } catch {
        return null;
      }
    },
    async deleteObject(path: string): Promise<void> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'Dropbox is disconnected.');
      }

      const response = await fetch(`${DROPBOX_API_URL}/files/delete_v2`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: dropboxPath(path) }),
      });

      if (response.status === 409) {
        return;
      }

      await requireOk(response, 'Dropbox delete');
    },
  };
}
