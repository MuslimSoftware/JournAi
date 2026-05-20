export type SyncProvider = 'google_drive' | 'dropbox' | 'onedrive' | 'icloud';

export type SyncCollection =
  | 'entries'
  | 'todos'
  | 'sticky_notes';

export type SyncConnectionStatus =
  | 'disabled'
  | 'disconnected'
  | 'needs_configuration'
  | 'connected'
  | 'syncing'
  | 'success'
  | 'error';

export interface SyncSettings {
  enabled: boolean;
  provider: SyncProvider | null;
  deviceId: string;
  lastSyncedAt: string | null;
}

export interface SyncProviderProfile {
  provider: SyncProvider;
  label: string;
  description: string;
  authLabel: string;
  oauthClientIdEnv?: string;
  configurationHint?: string;
}

export interface SyncAuthState {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  accountLabel?: string;
}

export interface RemoteSyncObject {
  path: string;
  modifiedAt: string | null;
  size?: number;
  etag?: string;
}

export interface SyncConnectorStatus {
  status: SyncConnectionStatus;
  message: string | null;
}

export interface SyncConnector {
  provider: SyncProvider;
  getStatus: () => Promise<SyncConnectorStatus>;
  listRemoteObjects: () => Promise<RemoteSyncObject[]>;
  downloadObject: (path: string) => Promise<string | null>;
  uploadObject: (path: string, content: string) => Promise<string | null>;
  deleteObject: (path: string) => Promise<void>;
}

export interface SyncKeyset {
  schemaVersion: 1;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  saltB64: string;
  wrappedKeyB64: string;
  ivB64: string;
  createdAt: string;
}

export interface EncryptedSyncPayload {
  algorithm: 'AES-256-GCM';
  ivB64: string;
  ciphertextB64: string;
}

export interface SyncEnvelope {
  schemaVersion: 1;
  appId: 'journai';
  collection: SyncCollection;
  recordId: string;
  version: number;
  deleted: boolean;
  updatedAt: string;
  deviceId: string;
  payloadHash: string;
  payload: EncryptedSyncPayload | null;
}

export interface SyncSummary {
  status: SyncConnectionStatus;
  message: string | null;
  pushed: number;
  pulled: number;
  conflicts: number;
  lastSyncedAt: string | null;
  pulledEntries?: number;
  pulledTodos?: number;
  pulledNotes?: number;
  pushedEntries?: number;
  pushedTodos?: number;
  pushedNotes?: number;
}

export interface SyncProgress {
  phase: 'preparing' | 'downloading' | 'uploading' | 'finalizing';
  message: string;
  current: number;
  total: number;
}
