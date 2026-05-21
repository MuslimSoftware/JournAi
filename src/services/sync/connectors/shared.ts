import type { RemoteSyncObject, SyncAuthState, SyncConnectorStatus, SyncProvider } from '../../../types/sync';
import { getValidProviderAuth } from '../oauth';
import { dlog } from '../../../lib/devLog';

const FILE_PREFIX = 'journai-sync-';
const FILE_SUFFIX = '.json';

export function remotePathToFileName(path: string): string {
  const encoded = btoa(path)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${FILE_PREFIX}${encoded}${FILE_SUFFIX}`;
}

export function fileNameToRemotePath(fileName: string): string | null {
  if (!fileName.startsWith(FILE_PREFIX) || !fileName.endsWith(FILE_SUFFIX)) {
    return null;
  }

  const encoded = fileName
    .slice(FILE_PREFIX.length, -FILE_SUFFIX.length)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = encoded.padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), '=');

  try {
    return atob(padded);
  } catch {
    return null;
  }
}

export function isSyncFileName(fileName: string): boolean {
  return fileNameToRemotePath(fileName) !== null;
}

export async function getAuthOrStatus(provider: SyncProvider): Promise<{ auth: SyncAuthState } | { status: SyncConnectorStatus }> {
  let auth: SyncAuthState | null = null;
  try {
    auth = await getValidProviderAuth(provider);
    dlog('[sync:auth] getAuthOrStatus provider =>', provider, 'hasToken =>', Boolean(auth?.accessToken), 'expiresAt =>', auth?.expiresAt ?? 'none');
  } catch (error) {
    dlog('[sync:auth] getAuthOrStatus error =>', String(error));
    return {
      status: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to refresh provider access.',
      },
    };
  }

  if (!auth?.accessToken) {
    dlog('[sync:auth] getAuthOrStatus => no access token, disconnected');
    return {
      status: {
        status: 'disconnected',
        message: 'Connect this provider before syncing.',
      },
    };
  }

  return { auth };
}

export async function fetchText(response: Response): Promise<string> {
  if (response.status === 204) {
    return '';
  }
  return response.text();
}

interface ApiErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: Array<{
      reason?: string;
      metadata?: Record<string, string | undefined>;
    }>;
  };
}

function parseApiError(text: string): ApiErrorBody | null {
  try {
    const parsed = JSON.parse(text) as ApiErrorBody;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function formatServiceDisabledError(body: ApiErrorBody): string | null {
  const serviceDisabled = body.error?.details?.find((detail) => detail.reason === 'SERVICE_DISABLED');
  if (!serviceDisabled) {
    return null;
  }

  const metadata = serviceDisabled.metadata ?? {};
  const serviceTitle = metadata.serviceTitle ?? metadata.service ?? 'Provider API';
  const project = metadata.consumer?.replace(/^projects\//, '') ?? metadata.containerInfo;
  const activationUrl = metadata.activationUrl;
  const projectPhrase = project ? ` for Google Cloud project ${project}` : '';
  const actionPhrase = activationUrl
    ? ` Enable it here: ${activationUrl}`
    : ' Enable it in Google Cloud Console.';

  return `${serviceTitle} is disabled${projectPhrase}.${actionPhrase} After enabling it, wait a few minutes and try again.`;
}

function formatApiError(text: string): string {
  const body = parseApiError(text);
  if (!body) {
    return text;
  }

  return formatServiceDisabledError(body)
    ?? body.error?.message
    ?? text;
}

export async function requireOk(response: Response, action: string): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const text = await fetchText(response);
  const detail = text ? formatApiError(text) : response.statusText;
  throw new Error(`${action} failed (${response.status}): ${detail}`);
}

export function buildRemoteObject(path: string, modifiedAt: string | null, size?: number, etag?: string): RemoteSyncObject {
  return {
    path,
    modifiedAt,
    size,
    etag,
  };
}
