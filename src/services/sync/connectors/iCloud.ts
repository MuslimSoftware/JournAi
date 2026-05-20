import type { SyncConnector } from '../../../types/sync';

export function createICloudConnector(): SyncConnector {
  return {
    provider: 'icloud',
    async getStatus() {
      return {
        status: 'needs_configuration',
        message: 'iCloud sync needs native CloudKit entitlements before it can connect.',
      };
    },
    async listRemoteObjects() {
      throw new Error('iCloud sync needs native CloudKit entitlements before it can connect.');
    },
    async downloadObject() {
      throw new Error('iCloud sync needs native CloudKit entitlements before it can connect.');
    },
    async uploadObject(): Promise<string | null> {
      throw new Error('iCloud sync needs native CloudKit entitlements before it can connect.');
    },
    async deleteObject() {
      throw new Error('iCloud sync needs native CloudKit entitlements before it can connect.');
    },
  };
}
