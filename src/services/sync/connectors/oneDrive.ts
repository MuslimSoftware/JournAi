import type { RemoteSyncObject, SyncConnector, SyncConnectorStatus } from '../../../types/sync';
import { buildRemoteObject, fileNameToRemotePath, getAuthOrStatus, remotePathToFileName, requireOk } from './shared';

const PROVIDER = 'onedrive';
const GRAPH_URL = 'https://graph.microsoft.com/v1.0';

interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  eTag?: string;
  lastModifiedDateTime?: string;
  file?: unknown;
}

interface OneDriveListResponse {
  value: OneDriveItem[];
  '@odata.nextLink'?: string;
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

function approotPath(path: string): string {
  return `/me/drive/special/approot:/${encodeURIComponent(remotePathToFileName(path))}`;
}

export function createOneDriveConnector(): SyncConnector {
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
        throw new Error(headers.message ?? 'OneDrive is disconnected.');
      }

      const objects: RemoteSyncObject[] = [];
      let url: string | null = `${GRAPH_URL}/me/drive/special/approot/children?$select=id,name,size,eTag,lastModifiedDateTime,file`;

      while (url) {
        const response = await requireOk(
          await fetch(url, { headers }),
          'OneDrive list'
        );
        const body = await response.json() as OneDriveListResponse;

        for (const item of body.value) {
          if (!item.file) {
            continue;
          }

          const path = fileNameToRemotePath(item.name);
          if (!path) {
            continue;
          }

          objects.push(buildRemoteObject(path, item.lastModifiedDateTime ?? null, item.size, item.eTag));
        }

        url = body['@odata.nextLink'] ?? null;
      }

      return objects;
    },
    async downloadObject(path: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'OneDrive is disconnected.');
      }

      const response = await fetch(`${GRAPH_URL}${approotPath(path)}:/content`, { headers });
      if (response.status === 404) {
        return null;
      }

      await requireOk(response, 'OneDrive download');
      return response.text();
    },
    async uploadObject(path: string, content: string): Promise<string | null> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'OneDrive is disconnected.');
      }

      const response = await requireOk(
        await fetch(`${GRAPH_URL}${approotPath(path)}:/content`, {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: content,
        }),
        'OneDrive upload'
      );
      try {
        const item = await response.json();
        return item.lastModifiedDateTime ?? null;
      } catch {
        return null;
      }
    },
    async deleteObject(path: string): Promise<void> {
      const headers = await getAuthHeaders();
      if (isStatus(headers)) {
        throw new Error(headers.message ?? 'OneDrive is disconnected.');
      }

      const response = await fetch(`${GRAPH_URL}${approotPath(path)}`, {
        method: 'DELETE',
        headers,
      });

      if (response.status === 404) {
        return;
      }

      await requireOk(response, 'OneDrive delete');
    },
  };
}
