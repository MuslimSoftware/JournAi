import type { SyncConnector } from '../../../types/sync';
import { createGoogleDriveConnector } from './googleDrive';

export function createSyncConnector(): SyncConnector {
  return createGoogleDriveConnector();
}
